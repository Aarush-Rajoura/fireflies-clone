from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.models import Meeting
from app.schemas.meeting import (
    ActionItemCountsRead,
    MeetingCreate,
    MeetingListItem,
    MeetingUpdate,
)
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
    )
    assert "segments" not in item.model_dump()
    assert "segments" not in Meeting.__mapper__.relationships.keys()
