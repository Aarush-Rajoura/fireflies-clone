"""Comments and highlights: service rules and the HTTP contract."""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.exceptions import GoneError, NotFoundError, ValidationFailedError
from app.schemas.comment import CommentCreate, CommentUpdate
from app.schemas.common import PageParams
from app.schemas.highlight import HighlightCreate, HighlightUpdate
from app.services.comments import CommentService
from app.services.highlights import HighlightService, utf16_length
from tests import factories as f
from tests.service_helpers import seeded

V1 = "/api/v1"


def test_comment_crud_newest_last_and_soft_delete(db_session: Session) -> None:
    uow, user, m = seeded(db_session)
    seg = f.make_segment(db_session, m, f.make_speaker(db_session, m), "Ship it")
    db_session.commit()
    svc = CommentService(uow)
    first = svc.create(m.id, CommentCreate(body="  Meeting-level  "))
    second = svc.create(m.id, CommentCreate(body="On a line", segment_id=seg.id))
    assert first.body == "Meeting-level" and first.author and first.author.id == user.id
    assert second.segment_id == seg.id
    assert [c.id for c in svc.list(m.id, PageParams()).items] == [first.id, second.id]
    assert svc.update(first.id, CommentUpdate(body="Edited")).body == "Edited"
    svc.delete(first.id)
    assert [c.id for c in svc.list(m.id, PageParams()).items] == [second.id]
    with pytest.raises(NotFoundError) as err:
        svc.update(first.id, CommentUpdate(body="again"))
    assert err.value.code == "COMMENT_NOT_FOUND"


def test_comment_on_another_meetings_segment_is_422(db_session: Session) -> None:
    uow, user, m = seeded(db_session)
    other = f.make_meeting(db_session, host=user)
    foreign = f.make_segment(db_session, other, f.make_speaker(db_session, other), "Elsewhere")
    db_session.commit()
    with pytest.raises(ValidationFailedError) as err:
        CommentService(uow).create(m.id, CommentCreate(body="x", segment_id=foreign.id))
    assert err.value.code == "SEGMENT_NOT_IN_MEETING"


def test_writes_on_a_deleted_meeting_are_410(db_session: Session) -> None:
    uow, user, m = seeded(db_session)
    seg = f.make_segment(db_session, m, f.make_speaker(db_session, m), "Hello there")
    db_session.commit()
    comment = CommentService(uow).create(m.id, CommentCreate(body="x"))
    hl = HighlightService(uow).create(
        m.id, HighlightCreate(segment_id=seg.id, start_offset=0, end_offset=5)
    )
    m.deleted_at = datetime.now(UTC)
    db_session.commit()
    with pytest.raises(GoneError):
        CommentService(uow).create(m.id, CommentCreate(body="y"))
    with pytest.raises(GoneError):
        CommentService(uow).delete(comment.id)
    with pytest.raises(GoneError):
        HighlightService(uow).update(hl.id, HighlightUpdate(color="green"))


def test_highlight_offsets_are_checked_against_the_text(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    seg = f.make_segment(db_session, m, f.make_speaker(db_session, m), "Hello")  # 5 chars
    db_session.commit()
    svc = HighlightService(uow)
    ok = svc.create(m.id, HighlightCreate(segment_id=seg.id, start_offset=0, end_offset=5))
    assert (ok.start_offset, ok.end_offset, ok.color) == (0, 5, "yellow")
    with pytest.raises(ValidationFailedError) as err:
        svc.create(m.id, HighlightCreate(segment_id=seg.id, start_offset=2, end_offset=6))
    assert err.value.code == "HIGHLIGHT_OUT_OF_RANGE"
    with pytest.raises(ValidationFailedError):
        svc.update(ok.id, HighlightUpdate(start_offset=5))  # start == end
    assert svc.update(ok.id, HighlightUpdate(start_offset=1, color="blue")).color == "blue"
    with pytest.raises(ValidationError):
        HighlightCreate(segment_id=seg.id, start_offset=3, end_offset=3)
    with pytest.raises(ValidationError):
        HighlightCreate(segment_id=seg.id, start_offset=0, end_offset=2, color="#ff0000")  # type: ignore[arg-type]
    svc.delete(ok.id)
    assert svc.list(m.id, PageParams()).total == 0


def test_highlight_offsets_are_utf16_code_units(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    text = "🚀 launch"  # 8 Python characters, 9 UTF-16 units: the emoji is a surrogate pair
    seg = f.make_segment(db_session, m, f.make_speaker(db_session, m), text)
    db_session.commit()
    assert (len(text), utf16_length(text)) == (8, 9)
    svc = HighlightService(uow)
    # What JavaScript reports for selecting "launch": text.indexOf("launch") == 3, length 9.
    word = svc.create(m.id, HighlightCreate(segment_id=seg.id, start_offset=3, end_offset=9))
    assert (word.start_offset, word.end_offset) == (3, 9)
    with pytest.raises(ValidationFailedError):
        svc.create(m.id, HighlightCreate(segment_id=seg.id, start_offset=3, end_offset=10))


def test_highlight_offset_unit_is_in_the_openapi_contract(api: TestClient) -> None:
    schema = api.get("/openapi.json").json()["components"]["schemas"]["HighlightCreate"]
    assert "UTF-16 code units" in schema["properties"]["start_offset"]["description"]
    assert "UTF-16 code units" in schema["properties"]["end_offset"]["description"]


def _meeting_with_segments(api: TestClient, title: str = "Sync") -> tuple[int, list[int]]:
    body = {
        "title": title,
        "segments": [
            {"speaker": "Ann", "start_ms": 0, "end_ms": 900, "text": "Hello team"},
            {"speaker": "Bob", "start_ms": 1000, "end_ms": 1900, "text": "Ship it"},
        ],
    }
    r = api.post(f"{V1}/meetings", json=body)
    assert r.status_code == 201, r.text
    mid = int(r.json()["id"])
    segments = api.get(f"{V1}/meetings/{mid}/transcript").json()["segments"]
    return mid, [s["id"] for s in segments]


def test_comments_api_contract(api: TestClient) -> None:
    mid, segs = _meeting_with_segments(api)
    _, other_segs = _meeting_with_segments(api, "Other")
    created = api.post(
        f"{V1}/meetings/{mid}/comments", json={"body": "Nice", "segment_id": segs[0]}
    )
    assert created.status_code == 201 and created.json()["author"]["name"]
    cross = api.post(
        f"{V1}/meetings/{mid}/comments", json={"body": "x", "segment_id": other_segs[0]}
    )
    assert cross.status_code == 422 and cross.json()["error"]["code"] == "SEGMENT_NOT_IN_MEETING"
    assert api.post(f"{V1}/meetings/{mid}/comments", json={"body": "  "}).status_code == 422
    assert api.post(f"{V1}/meetings/{mid}/comments", json={"body": "x" * 2001}).status_code == 422
    listed = api.get(f"{V1}/meetings/{mid}/comments").json()
    assert listed["total"] == 1 and "has_next" in listed
    cid = created.json()["id"]
    assert api.patch(f"{V1}/comments/{cid}", json={"body": "Edited"}).json()["body"] == "Edited"
    r = api.delete(f"{V1}/comments/{cid}")
    assert r.status_code == 204 and r.content == b""
    assert api.delete(f"{V1}/comments/{cid}").status_code == 404


def test_highlights_api_contract(api: TestClient) -> None:
    mid, segs = _meeting_with_segments(api)
    url = f"{V1}/meetings/{mid}/highlights"
    created = api.post(url, json={"segment_id": segs[1], "start_offset": 0, "end_offset": 4})
    assert created.status_code == 201, created.text
    out = api.post(url, json={"segment_id": segs[1], "start_offset": 0, "end_offset": 99})
    assert out.status_code == 422 and out.json()["error"]["code"] == "HIGHLIGHT_OUT_OF_RANGE"
    backwards = api.post(url, json={"segment_id": segs[1], "start_offset": 3, "end_offset": 1})
    assert backwards.status_code == 422
    bad_colour = api.post(
        url, json={"segment_id": segs[1], "start_offset": 0, "end_offset": 1, "color": "red"}
    )
    assert bad_colour.status_code == 422
    assert api.get(url).json()["total"] == 1
    hid = created.json()["id"]
    assert api.patch(f"{V1}/highlights/{hid}", json={"color": "pink"}).json()["color"] == "pink"
    r = api.delete(f"{V1}/highlights/{hid}")
    assert r.status_code == 204 and r.content == b""
    assert api.delete(f"{V1}/meetings/{mid}").status_code == 204
    assert api.get(url).status_code == 410
