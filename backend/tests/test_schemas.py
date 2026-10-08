from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.models import Meeting
from app.schemas.action_item import ActionItemCreate, ActionItemUpdate
from app.schemas.meeting import (
    ActionItemCountsRead,
    MeetingCreate,
    MeetingListItem,
    MeetingUpdate,
)
from app.schemas.transcript import SegmentIn
from app.schemas.user import UserRef


def test_create_rejects_empty_segments() -> None:
    with pytest.raises(ValidationError):
        MeetingCreate(title="x", segments=[])


def test_create_allows_missing_segments() -> None:
    assert MeetingCreate(title="x", segments=None).segments is None


def test_create_accepts_segments() -> None:
    seg = {"speaker": " Ann ", "start_ms": 0, "end_ms": 10, "text": " hi "}
    m = MeetingCreate(title="x", segments=[seg])  # type: ignore[list-item]
    assert m.segments and m.segments[0].speaker == "Ann" and m.segments[0].text == "hi"


@pytest.mark.parametrize("title", ["", "   "])
def test_blank_title_rejected(title: str) -> None:
    with pytest.raises(ValidationError):
        MeetingCreate(title=title)
    with pytest.raises(ValidationError):
        MeetingUpdate(title=title)


def test_update_accepts_plain_names_and_rejects_duplicates() -> None:
    u = MeetingUpdate(participants=["Ann", "Bob"])  # type: ignore[list-item]
    assert u.participants and [p.display_name for p in u.participants] == ["Ann", "Bob"]
    with pytest.raises(ValidationError):
        MeetingUpdate(participants=["Ann", "ann"])  # type: ignore[list-item]


def test_update_distinguishes_unset_from_null() -> None:
    assert "channel_id" not in MeetingUpdate(title="t").model_fields_set
    assert "channel_id" in MeetingUpdate(channel_id=None).model_fields_set


def test_list_item_serialises_without_transcript() -> None:
    item = MeetingListItem(
        id=1,
        title="t",
        started_at=datetime(2026, 1, 1, tzinfo=UTC),
        duration_ms=5,
        host=UserRef(id=1, name="A"),
        participant_count=0,
        action_item_counts=ActionItemCountsRead(open=0, completed=0),
        keywords=[],
        tags=[],
        has_media=False,
        participants=[],
        overview_preview=None,
        status="completed",
        channel_id=None,
        channel=None,
        meeting_url=None,
        platform=None,
        language="en",
        auto_join=False,
    )
    assert "segments" not in item.model_dump()
    assert "segments" not in Meeting.__mapper__.relationships.keys()


def test_input_schemas_forbid_extras_and_null_required_fields() -> None:
    with pytest.raises(ValidationError):
        MeetingUpdate(titel="typo")  # type: ignore[call-arg]
    with pytest.raises(ValidationError):
        MeetingUpdate(title=None)
    with pytest.raises(ValidationError):
        MeetingUpdate(started_at=None)
    with pytest.raises(ValidationError):
        MeetingCreate(title="x", bogus=1)  # type: ignore[call-arg]


def test_segment_and_datetime_rules() -> None:
    with pytest.raises(ValidationError):
        SegmentIn(speaker="A", start_ms=10, end_ms=5, text="x")
    with pytest.raises(ValidationError):
        ActionItemCreate(text="x", start_ms=-1)
    with pytest.raises(ValidationError):
        MeetingUpdate(started_at=datetime(2026, 1, 1))  # naive


@pytest.mark.parametrize("source", ["seed", "capture", "calendar", "bogus"])
def test_create_rejects_server_only_sources(source: str) -> None:
    with pytest.raises(ValidationError):
        MeetingCreate.model_validate({"title": "t", "source": source})


@pytest.mark.parametrize("source", ["upload", "paste", "manual"])
def test_create_accepts_client_sources(source: str) -> None:
    assert MeetingCreate.model_validate({"title": "t", "source": source}).source == source


@pytest.mark.parametrize("field", ["text", "status"])
def test_action_item_update_rejects_explicit_null(field: str) -> None:
    with pytest.raises(ValidationError):
        ActionItemUpdate.model_validate({field: None})
    # Clearable fields still accept null.
    u = ActionItemUpdate.model_validate({"due_date": None, "assignee_participant_id": None})
    assert u.model_fields_set == {"due_date", "assignee_participant_id"}
