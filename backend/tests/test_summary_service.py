import dataclasses
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.ai.interfaces import ProviderError
from app.ai.types import NoteGroup, OutlineEntry
from app.core.exceptions import ConflictError, GoneError, ValidationFailedError
from app.db.unit_of_work import UnitOfWork
from app.models import Keyword, Meeting, Summary, SummarySection
from app.services.summary import SummaryService
from tests import factories as f
from tests.ai_stubs import StubSummarizer, summary_result
from tests.service_helpers import seeded


def _meeting_with_transcript(db: Session) -> tuple[UnitOfWork, Meeting]:
    uow, _, m = seeded(db)
    sp = f.make_speaker(db, m, "Alice")
    f.make_segment(db, m, sp, "We should ship on Friday", sequence=0)
    f.make_segment(db, m, sp, "And write the tests", sequence=1)
    db.commit()
    return uow, m


def _save(uow: UnitOfWork, m: Meeting, tag: str = "v1") -> None:
    result = summary_result(tag)
    SummaryService(uow, StubSummarizer()).save_result(m, result, result.provider, result.model)
    uow.commit()


def test_get_without_summary_is_empty_state(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    out = SummaryService(uow, StubSummarizer()).get(m.id)
    assert (out.overview, out.keywords, out.outline, out.notes) == ("", [], [], [])
    assert out.provider is None and out.generated_at is None and out.is_stale is False


def test_get_composes_sections_in_order(db_session: Session) -> None:
    uow, m = _meeting_with_transcript(db_session)
    _save(uow, m)
    out = SummaryService(uow, StubSummarizer()).get(m.id)
    assert list(out.model_dump())[:4] == ["overview", "keywords", "outline", "notes"]
    assert out.overview == "Overview v1"
    assert out.keywords == ["alpha-v1", "beta-v1"]
    assert [(o.title, o.start_ms) for o in out.outline] == [("Intro v1", 0), ("Plan v1", 1500)]
    assert [(n.title, n.bullets) for n in out.notes] == [("Decisions v1", ["ship it", "test it"])]
    assert (out.provider, out.model) == ("stub", "stub-1")
    assert out.generated_at is not None


def test_get_on_deleted_meeting_is_gone(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    uow.meetings.soft_delete(m)
    db_session.commit()
    with pytest.raises(GoneError):
        SummaryService(uow, StubSummarizer()).get(m.id)


def test_regenerate_replaces_sections_and_keywords(db_session: Session) -> None:
    uow, m = _meeting_with_transcript(db_session)
    _save(uow, m, "v1")
    summary = db_session.query(Summary).one()
    summary.is_stale = True
    db_session.commit()
    stub = StubSummarizer(summary_result("v2", provider="gemini", model="g-2"))
    out = SummaryService(uow, stub).regenerate(m.id)
    assert out.overview == "Overview v2" and out.keywords == ["alpha-v2", "beta-v2"]
    assert [o.title for o in out.outline] == ["Intro v2", "Plan v2"]
    assert (out.provider, out.model, out.is_stale) == ("gemini", "g-2", False)
    assert db_session.query(SummarySection).count() == 3
    assert db_session.query(Keyword).count() == 2
    assert db_session.query(Summary).one().generating_since is None
    assert [line.text for line in stub.calls[0].lines] == [
        "We should ship on Friday",
        "And write the tests",
    ]


def test_regenerate_with_same_keyword_does_not_clash(db_session: Session) -> None:
    uow, m = _meeting_with_transcript(db_session)
    _save(uow, m, "v1")
    out = SummaryService(uow, StubSummarizer(summary_result("v1"))).regenerate(m.id)
    assert out.keywords == ["alpha-v1", "beta-v1"]


def test_regenerate_creates_first_summary(db_session: Session) -> None:
    uow, m = _meeting_with_transcript(db_session)
    out = SummaryService(uow, StubSummarizer()).regenerate(m.id)
    assert out.overview == "Overview v1" and db_session.query(Summary).count() == 1


def test_regenerate_calls_ai_with_no_transaction_open(db_session: Session) -> None:
    uow, m = _meeting_with_transcript(db_session)
    seen: list[bool] = []
    stub = StubSummarizer(on_call=lambda _: seen.append(uow.session.in_transaction()))
    SummaryService(uow, stub).regenerate(m.id)
    assert seen == [False]


def test_regenerate_while_claim_fresh_is_409(db_session: Session) -> None:
    uow, m = _meeting_with_transcript(db_session)
    _save(uow, m)
    db_session.query(Summary).one().generating_since = datetime.now(UTC) - timedelta(seconds=30)
    db_session.commit()
    stub = StubSummarizer()
    with pytest.raises(ConflictError) as err:
        SummaryService(uow, stub).regenerate(m.id)
    assert err.value.code == "SUMMARY_GENERATING"
    assert stub.calls == []


def test_regenerate_ignores_stale_claim(db_session: Session) -> None:
    uow, m = _meeting_with_transcript(db_session)
    _save(uow, m)
    db_session.query(Summary).one().generating_since = datetime.now(UTC) - timedelta(minutes=5)
    db_session.commit()
    out = SummaryService(uow, StubSummarizer(summary_result("v2"))).regenerate(m.id)
    assert out.overview == "Overview v2"
    assert db_session.query(Summary).one().generating_since is None


def test_failed_ai_clears_claim_and_keeps_old_summary(db_session: Session) -> None:
    uow, m = _meeting_with_transcript(db_session)
    _save(uow, m, "v1")
    with pytest.raises(ProviderError):
        SummaryService(uow, StubSummarizer(fail=True)).regenerate(m.id)
    summary = db_session.query(Summary).one()
    assert summary.generating_since is None and summary.overview == "Overview v1"


def test_failed_first_generation_leaves_no_summary(db_session: Session) -> None:
    uow, m = _meeting_with_transcript(db_session)
    with pytest.raises(ProviderError):
        SummaryService(uow, StubSummarizer(fail=True)).regenerate(m.id)
    assert db_session.query(Summary).count() == 0


def test_regenerate_without_transcript_is_422(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    with pytest.raises(ValidationFailedError) as err:
        SummaryService(uow, StubSummarizer()).regenerate(m.id)
    assert err.value.code == "TRANSCRIPT_EMPTY"


def test_provider_label_stored(db_session: Session) -> None:
    uow, m = _meeting_with_transcript(db_session)
    stub = StubSummarizer(summary_result(provider="mock (llm fallback)", model=None))
    SummaryService(uow, stub).regenerate(m.id)
    row = db_session.query(Summary).one()
    assert (row.provider, row.model) == ("mock (llm fallback)", None)


def test_regenerate_snaps_outline_to_line_starts(db_session: Session) -> None:
    uow, m = _meeting_with_transcript(db_session)  # lines start at 0 and 1000
    out = SummaryService(uow, StubSummarizer(summary_result("v2"))).regenerate(m.id)
    assert [o.start_ms for o in out.outline] == [0, 1000]


def test_regenerate_snaps_with_unsorted_overlapping_lines(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    sp = f.make_speaker(db_session, m)
    for seq, start in enumerate([5000, 1000, 3000, 3000]):
        seg = f.make_segment(db_session, m, sp, f"line {seq}", sequence=seq)
        seg.start_ms, seg.end_ms = start, start + 500
    db_session.commit()
    result = dataclasses.replace(
        summary_result(), outline=[OutlineEntry("a", 3200), OutlineEntry("b", 900)]
    )
    out = SummaryService(uow, StubSummarizer(result)).regenerate(m.id)
    assert [o.start_ms for o in out.outline] == [3000, 1000]


def _take_over(db: Session, when: datetime) -> None:
    db.execute(update(Summary).values(generating_since=when))
    db.commit()


def test_regenerate_after_claim_takeover_is_409_and_writes_nothing(db_session: Session) -> None:
    uow, m = _meeting_with_transcript(db_session)
    _save(uow, m, "v1")
    theirs = datetime.now(UTC) + timedelta(seconds=5)
    stub = StubSummarizer(summary_result("v2"), on_call=lambda _: _take_over(db_session, theirs))
    with pytest.raises(ConflictError) as err:
        SummaryService(uow, stub).regenerate(m.id)
    assert err.value.code == "SUMMARY_GENERATING"
    db_session.expire_all()
    row = db_session.query(Summary).one()
    assert row.overview == "Overview v1" and row.generating_since == theirs


def test_failed_ai_does_not_clear_someone_elses_claim(db_session: Session) -> None:
    uow, m = _meeting_with_transcript(db_session)
    _save(uow, m, "v1")
    theirs = datetime.now(UTC) + timedelta(seconds=5)
    stub = StubSummarizer(fail=True, on_call=lambda _: _take_over(db_session, theirs))
    with pytest.raises(ProviderError):
        SummaryService(uow, stub).regenerate(m.id)
    db_session.expire_all()
    assert db_session.query(Summary).one().generating_since == theirs


def test_failed_release_does_not_mask_ai_error(
    db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    uow, m = _meeting_with_transcript(db_session)
    _save(uow, m, "v1")

    def broken(*_: object) -> bool:
        raise RuntimeError("db locked")

    monkeypatch.setattr(uow.summaries, "release_claim", broken)
    with pytest.raises(ProviderError):
        SummaryService(uow, StubSummarizer(fail=True)).regenerate(m.id)


def test_note_groups_with_same_title_stay_separate(db_session: Session) -> None:
    uow, m = _meeting_with_transcript(db_session)
    result = dataclasses.replace(
        summary_result(),
        notes=[NoteGroup("Risks", ["a"]), NoteGroup("Plan", ["b"]), NoteGroup("Risks", ["c"])],
    )
    SummaryService(uow, StubSummarizer()).save_result(m, result, "stub", None)
    uow.commit()
    out = SummaryService(uow, StubSummarizer()).get(m.id)
    assert [(n.title, n.bullets) for n in out.notes] == [
        ("Risks", ["a"]),
        ("Plan", ["b"]),
        ("Risks", ["c"]),
    ]
