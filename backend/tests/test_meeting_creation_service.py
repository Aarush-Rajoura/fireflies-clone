from typing import Any

import pytest
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.ai.interfaces import ProviderError
from app.ai.types import ActionItemDraft, TranscriptForAI
from app.core.exceptions import ServiceUnavailableError, ValidationFailedError
from app.db.unit_of_work import UnitOfWork
from app.models import ActionItem, Meeting, Participant, Speaker, Summary, TranscriptSegment
from app.models.enums import ActionItemSource, MeetingSource, MeetingStatus, ParticipantRole
from app.parsers import default_registry
from app.schemas.meeting import MeetingCreate
from app.schemas.transcript import SegmentIn
from app.services.meeting_creation import MeetingCreationService
from app.services.summary import SummaryService
from tests.ai_stubs import StubExtractor, StubSummarizer, summary_result
from tests.service_helpers import seeded

SEGMENTS = [
    SegmentIn(speaker="Alice", start_ms=0, end_ms=1000, text="Let's plan the launch"),
    SegmentIn(speaker="bob", start_ms=1000, end_ms=2600, text="I will send the deck"),
    SegmentIn(speaker="Alice", start_ms=2600, end_ms=4000, text="Great, thanks Bob"),
]
DRAFTS = [
    ActionItemDraft(text="Send the deck", assignee="BOB", start_ms=1200),
    ActionItemDraft(text="Book a room", assignee="Zed", start_ms=None),
]


def _service(
    uow: UnitOfWork,
    summarizer: StubSummarizer | None = None,
    extractor: StubExtractor | None = None,
    max_upload_mb: int = 10,
) -> MeetingCreationService:
    summ = summarizer or StubSummarizer()
    return MeetingCreationService(
        uow,
        default_registry(),
        summ,
        extractor or StubExtractor(DRAFTS),
        SummaryService(uow, summ),
        max_upload_mb=max_upload_mb,
    )


def _data(**over: Any) -> MeetingCreate:
    base: dict[str, Any] = {
        "title": "Launch planning",
        "participants": ["Bob", "Carol"],
        "segments": SEGMENTS,
        "source": MeetingSource.PASTE,
    }
    return MeetingCreate(**(base | over))


def test_create_with_segments_writes_everything(db_session: Session) -> None:
    uow, user, _ = seeded(db_session)
    out = _service(uow).create(_data())
    assert out.title == "Launch planning" and out.host.id == user.id
    assert out.duration_ms == 4000 and out.summary_status == "ready"
    assert out.source == MeetingSource.PASTE and out.status == MeetingStatus.COMPLETED
    names = {p.display_name: p for p in out.participants}
    # "bob" matched the listed "Bob" case-insensitively; Alice was created from the transcript.
    assert set(names) == {"Bob", "Carol", "Alice", "Sarah Chen"}
    assert (names["Alice"].talk_ms, names["Bob"].talk_ms, names["Carol"].talk_ms) == (
        2400,
        1600,
        0,
    )
    speakers = {s.label: s for s in out.speakers}
    assert speakers["bob"].participant_id == names["Bob"].id and speakers["bob"].name == "Bob"
    assert all(0 <= s.color_index < 8 for s in out.speakers)
    segs = db_session.query(TranscriptSegment).order_by(TranscriptSegment.sequence).all()
    assert [s.sequence for s in segs] == [0, 1, 2]
    assert segs[1].original_text == "I will send the deck"
    assert out.keywords == ["alpha-v1", "beta-v1"]
    assert db_session.query(Summary).one().provider == "stub"


def test_create_runs_ai_action_items_with_assignees(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    out = _service(uow).create(_data())
    items = db_session.query(ActionItem).order_by(ActionItem.sequence).all()
    bob = db_session.query(Participant).filter_by(meeting_id=out.id, display_name="Bob").one()
    assert [(i.text, i.source, i.sequence) for i in items] == [
        ("Send the deck", ActionItemSource.AI, 0),
        ("Book a room", ActionItemSource.AI, 1),
    ]
    assert items[0].assignee_participant_id == bob.id
    assert items[1].assignee_participant_id is None
    # Snapped to the start of the line that contains it.
    assert items[0].start_ms == 1000
    assert out.action_item_counts.open == 2


def test_ai_sees_placeholder_ids_and_participant_names(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    summ, ext = StubSummarizer(), StubExtractor(DRAFTS)
    _service(uow, summ, ext).create(_data())
    t: TranscriptForAI = summ.calls[0]
    assert t.meeting_title == "Launch planning"
    assert [(line.segment_id, line.speaker) for line in t.lines] == [
        (0, "Alice"),
        (1, "Bob"),
        (2, "Alice"),
    ]
    assert ext.calls == [t]


def test_ai_is_called_before_any_db_write(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    seen: list[tuple[bool, int]] = []

    def check(_: TranscriptForAI) -> None:
        seen.append((uow.session.in_transaction(), len(uow.session.new)))

    _service(uow, StubSummarizer(on_call=check), StubExtractor(on_call=check)).create(_data())
    assert seen == [(False, 0), (False, 0)]


def test_db_failure_in_step_two_leaves_no_meeting(
    db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    uow, _, existing = seeded(db_session)

    def boom(*_: object) -> None:
        raise RuntimeError("disk full")

    monkeypatch.setattr(uow.action_items, "bulk_add", boom)
    with pytest.raises(RuntimeError):
        _service(uow).create(_data())
    assert [m.id for m in db_session.query(Meeting).all()] == [existing.id]
    for model in (Participant, Speaker, TranscriptSegment, Summary, ActionItem):
        assert db_session.query(model).count() == 0


def test_ai_failure_writes_nothing(db_session: Session) -> None:
    uow, _, existing = seeded(db_session)
    with pytest.raises(ProviderError):
        _service(uow, StubSummarizer(fail=True)).create(_data())
    assert [m.id for m in db_session.query(Meeting).all()] == [existing.id]


def test_form_meeting_has_no_ai_and_empty_summary(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    summ, ext = StubSummarizer(), StubExtractor(DRAFTS)
    out = _service(uow, summ, ext).create(_data(segments=None, source=MeetingSource.MANUAL))
    assert summ.calls == [] and ext.calls == []
    assert out.summary_status == "none" and out.duration_ms == 0
    assert out.status == MeetingStatus.COMPLETED and out.speakers == []
    assert [p.display_name for p in out.participants] == ["Bob", "Carol", "Sarah Chen"]
    assert SummaryService(uow, summ).get(out.id).overview == ""


def test_empty_segments_rejected() -> None:
    with pytest.raises(ValidationError):
        _data(segments=[])


def test_unknown_channel_is_422_and_rolls_back(db_session: Session) -> None:
    uow, _, existing = seeded(db_session)
    with pytest.raises(ValidationFailedError) as err:
        _service(uow).create(_data(channel_id=999))
    assert err.value.code == "CHANNEL_NOT_FOUND"
    assert [m.id for m in db_session.query(Meeting).all()] == [existing.id]


def test_create_requires_seeded_user(db_session: Session) -> None:
    with pytest.raises(ServiceUnavailableError) as err:
        _service(UnitOfWork(db_session)).create(_data(segments=None))
    assert err.value.code == "NOT_SEEDED"


def test_provenance_from_result(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    summ = StubSummarizer(summary_result(provider="gemini", model="gemini-x"))
    _service(uow, summ).create(_data())
    row = db_session.query(Summary).one()
    assert (row.provider, row.model) == ("gemini", "gemini-x")


def test_preview_parses_without_db_writes(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    content = "WEBVTT\n\n00:00:01.000 --> 00:00:03.500\n<v Alice>Hello there\n"
    out = _service(uow).preview(content, "call.vtt")
    assert out.format == "vtt" and out.segment_count == 1 and out.duration_ms == 3500
    assert out.speakers == ["Alice"] and out.segments[0].text == "Hello there"
    assert db_session.query(Meeting).count() == 1
    assert not uow.session.new and not uow.session.dirty


def test_preview_too_large_is_422(db_session: Session) -> None:
    uow = UnitOfWork(db_session)
    content = "Alice: " + "x" * (1024 * 1024 + 10)
    with pytest.raises(ValidationFailedError) as err:
        _service(uow, max_upload_mb=1).preview(content, "big.txt")
    assert err.value.code == "UPLOAD_TOO_LARGE"


def test_preview_default_limit_from_settings(db_session: Session) -> None:
    uow = UnitOfWork(db_session)
    summ = StubSummarizer()
    svc = MeetingCreationService(
        uow, default_registry(), summ, StubExtractor(), SummaryService(uow, summ)
    )
    with pytest.raises(ValidationFailedError) as err:
        svc.preview("x" * (10 * 1024 * 1024 + 1), "big.txt")
    assert err.value.code == "UPLOAD_TOO_LARGE"


def test_colour_index_is_stable_per_label(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    a = _service(uow).create(_data())
    b = _service(uow).create(_data(title="Again"))
    colours = [{s.label: s.color_index for s in m.speakers} for m in (a, b)]
    assert colours[0] == colours[1]


def test_host_is_added_as_host_participant(db_session: Session) -> None:
    uow, user, _ = seeded(db_session)
    out = _service(uow).create(_data(segments=None))
    host = db_session.query(Participant).filter_by(meeting_id=out.id, user_id=user.id).one()
    assert (host.display_name, host.role) == ("Sarah Chen", ParticipantRole.HOST)


def test_listed_host_is_linked_not_duplicated(db_session: Session) -> None:
    uow, user, _ = seeded(db_session)
    out = _service(uow).create(_data(participants=["sarah chen", "Bob"], segments=None))
    assert [p.display_name for p in out.participants] == ["sarah chen", "Bob"]
    linked = db_session.query(Participant).filter_by(meeting_id=out.id, user_id=user.id).one()
    assert linked.display_name == "sarah chen" and linked.role == ParticipantRole.HOST


def test_bad_channel_costs_no_ai_call(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    summ, ext = StubSummarizer(), StubExtractor()
    with pytest.raises(ValidationFailedError) as err:
        _service(uow, summ, ext).create(_data(channel_id=999))
    assert err.value.code == "CHANNEL_NOT_FOUND"
    assert summ.calls == [] and ext.calls == []
    assert not uow.session.in_transaction()


def test_leftover_read_transaction_is_closed_before_ai(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    db_session.query(Meeting).count()  # a caller's read leaves a transaction open
    assert uow.session.in_transaction()
    seen: list[bool] = []
    summ = StubSummarizer(on_call=lambda _: seen.append(uow.session.in_transaction()))
    _service(uow, summ).create(_data())
    assert seen == [False]


def test_unsorted_segments_snap_correctly(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    segments = [
        SegmentIn(speaker="Alice", start_ms=1000, end_ms=2000, text="early"),
        SegmentIn(speaker="Alice", start_ms=5000, end_ms=6000, text="late"),
        SegmentIn(speaker="Alice", start_ms=3000, end_ms=4500, text="middle"),
    ]
    drafts = [ActionItemDraft(text="Do it", assignee=None, start_ms=4000)]
    _service(uow, extractor=StubExtractor(drafts)).create(_data(segments=segments))
    assert db_session.query(ActionItem).one().start_ms == 3000
