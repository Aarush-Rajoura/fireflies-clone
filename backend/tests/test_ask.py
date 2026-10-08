from datetime import UTC, datetime

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.ai.factory import get_question_answerer
from app.ai.mock import MockProvider
from app.ai.types import Passage
from app.core.exceptions import GoneError, ValidationFailedError
from app.db.search import to_any_query
from app.models import Meeting, Summary
from app.services.ask import AskService
from tests import factories as f
from tests.ai_stubs import StubAnswerer
from tests.service_helpers import seeded

V1 = "/api/v1"


def _transcript(db: Session, title: str, lines: list[str]) -> tuple[int, list[int]]:
    user = f.make_user(db)
    meeting = f.make_meeting(db, host=user, title=title)
    speaker = f.make_speaker(db, meeting, "Ann")
    ids = [
        f.make_segment(db, meeting, speaker, text, sequence=i).id for i, text in enumerate(lines)
    ]
    db.commit()
    return meeting.id, ids


def test_citations_point_at_real_segments_of_the_meeting(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    mid, segs = _transcript(
        db_session, "Pricing", ["Hello all", "The pricing tier moves to forty dollars", "Bye"]
    )
    result = AskService(uow, MockProvider()).ask_meeting(mid, "What about the pricing tier?")
    assert result.citations, result.answer
    assert {c.segment_id for c in result.citations} <= set(segs)
    cite = result.citations[0]
    assert cite.segment_id == segs[1] and cite.start_ms == 1000 and cite.meeting_id == mid
    assert result.provider == "mock"


def test_invented_citations_are_dropped_and_no_transaction_is_open(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    mid, segs = _transcript(db_session, "Sync", ["Alpha", "Beta"])
    _, foreign = _transcript(db_session, "Other", ["Gamma"])
    open_during_ai: list[bool] = []
    stub = StubAnswerer(
        cite=[segs[1], 999_999, foreign[0], segs[1]],
        on_call=lambda _: open_during_ai.append(db_session.in_transaction()),
    )
    result = AskService(uow, stub).ask_meeting(mid, "beta?")
    assert [c.segment_id for c in result.citations] == [segs[1]]
    assert result.citations[0].start_ms == 1000  # from the database, not the provider
    assert result.citations[0].quote == "Beta"
    assert (result.provider, result.model) == ("stub", "stub-1")
    assert open_during_ai == [False]
    assert [p.segment_id for p in stub.calls[0][1]] == segs


def test_guards_run_before_the_ai_and_the_limiter(db_session: Session) -> None:
    uow, user, empty = seeded(db_session)
    gone = f.make_meeting(db_session, host=user, deleted_at=datetime.now(UTC))
    db_session.commit()
    stub, counted = StubAnswerer(), []
    svc = AskService(uow, stub)
    with pytest.raises(ValidationFailedError) as err:
        svc.ask_meeting(empty.id, "anything?", before_ai=lambda: counted.append(1))
    assert err.value.code == "TRANSCRIPT_EMPTY"
    with pytest.raises(GoneError):
        svc.ask_meeting(gone.id, "anything?", before_ai=lambda: counted.append(1))
    assert counted == [] and stub.calls == []


def test_cross_meeting_passages_are_hits_then_summaries(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    a, a_segs = _transcript(db_session, "Budget", ["The marketing budget doubles", "Lunch"])
    b, b_segs = _transcript(db_session, "Hiring", ["Budget for two engineers", "Nothing"])
    c, _ = _transcript(db_session, "Deleted", ["Budget is secret"])
    db_session.add(Summary(meeting_id=a, overview="Budget review overview"))
    db_session.get_one(Meeting, c).deleted_at = datetime.now(UTC)
    db_session.commit()
    stub = StubAnswerer(cite=[a_segs[0], b_segs[0]])
    result = AskService(uow, stub).ask_across("What did we decide about the budget?")
    passages: list[Passage] = stub.calls[0][1]
    segment_hits = [p.segment_id for p in passages if p.segment_id is not None]
    assert set(segment_hits) == {a_segs[0], b_segs[0]}
    assert [p.text for p in passages if p.segment_id is None] == ["Budget review overview"]
    assert {(c.meeting_id, c.meeting_title) for c in result.citations} == {
        (a, "Budget"),
        (b, "Hiring"),
    }
    stub.calls.clear()
    AskService(uow, stub).ask_across("budget", [b])
    assert {p.meeting_id for p in stub.calls[0][1]} == {b}


def test_question_glue_never_reaches_the_index() -> None:
    assert to_any_query("What did we say about the launch?") == '"launch"'
    assert to_any_query('pricing" OR * NEAR(') == '"pricing" OR "near"'
    assert to_any_query("what is it?") == ""


def _meeting_with_transcript(api: TestClient) -> tuple[int, list[int]]:
    body = {
        "title": "Launch",
        "segments": [
            {"speaker": "Ann", "start_ms": 0, "end_ms": 900, "text": "Hello team"},
            {"speaker": "Bob", "start_ms": 1000, "end_ms": 1900, "text": "Launch date is Friday"},
        ],
    }
    mid = int(api.post(f"{V1}/meetings", json=body).json()["id"])
    segs = [s["id"] for s in api.get(f"{V1}/meetings/{mid}/transcript").json()["segments"]]
    return mid, segs


def test_ask_api_contract(api: TestClient) -> None:
    mid, segs = _meeting_with_transcript(api)
    r = api.post(f"{V1}/meetings/{mid}/ask", json={"question": "When is the launch date?"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == {"answer", "citations", "provider", "model"}
    assert body["citations"] and {c["segment_id"] for c in body["citations"]} <= set(segs)
    assert body["citations"][0]["start_ms"] == 1000
    for bad in ({"question": "   "}, {"question": "x" * 501}, {}, {"question": "q", "x": 1}):
        resp = api.post(f"{V1}/meetings/{mid}/ask", json=bad)
        assert resp.status_code == 422, bad
    history = [{"role": "user", "text": "hi"}, {"role": "assistant", "text": "hello"}]
    ok = api.post(f"{V1}/meetings/{mid}/ask", json={"question": "launch?", "history": history})
    assert ok.status_code == 200
    assert api.post(f"{V1}/meetings/999/ask", json={"question": "q"}).status_code == 404

    across = api.post(f"{V1}/search/ask", json={"question": "launch date"})
    assert across.status_code == 200
    assert across.json()["citations"][0]["meeting_id"] == mid
    scoped = api.post(f"{V1}/search/ask", json={"question": "launch", "meeting_ids": [mid + 1]})
    assert scoped.status_code == 200 and scoped.json()["citations"] == []
    assert api.post(f"{V1}/search/ask", json={"question": ""}).status_code == 422


def test_ask_is_rate_limited(api: TestClient, app: FastAPI) -> None:
    mid, _ = _meeting_with_transcript(api)
    app.state.settings.ai_rate_limit = "2/minute"
    app.state.limiter.reset()
    url = f"{V1}/meetings/{mid}/ask"
    # Rejected requests are not counted.
    assert api.post(f"{V1}/meetings/999/ask", json={"question": "q"}).status_code == 404
    codes = [api.post(url, json={"question": "launch?"}).status_code for _ in range(3)]
    assert codes == [200, 200, 429]
    limited = api.post(f"{V1}/search/ask", json={"question": "launch"})
    assert limited.status_code == 429 and limited.json()["error"]["code"] == "RATE_LIMITED"


def test_provider_failure_is_503(api: TestClient, api_app: FastAPI) -> None:
    mid, _ = _meeting_with_transcript(api)
    api_app.dependency_overrides[get_question_answerer] = lambda: StubAnswerer(fail=True)
    r = api.post(f"{V1}/meetings/{mid}/ask", json={"question": "launch?"})
    assert r.status_code == 503 and r.json()["error"]["code"] == "AI_UNAVAILABLE"
