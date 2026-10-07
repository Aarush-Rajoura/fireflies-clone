"""Plain row factories for repository and service tests. Each flushes, never commits."""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models import (
    ActionItem,
    Meeting,
    MeetingTag,
    Participant,
    Speaker,
    Tag,
    TranscriptSegment,
    User,
)
from app.models.enums import ActionItemStatus, MeetingSource, MeetingStatus

_counter = 0


def _next() -> int:
    global _counter
    _counter += 1
    return _counter


def make_user(db: Session, *, name: str = "Sarah Chen") -> User:
    user = User(name=name, email=f"u{_next()}@example.com")
    db.add(user)
    db.flush()
    return user


def make_meeting(
    db: Session,
    *,
    host: User | None = None,
    title: str = "Weekly sync",
    started_at: datetime | None = None,
    duration_ms: int = 0,
    status: MeetingStatus = MeetingStatus.COMPLETED,
    source: MeetingSource = MeetingSource.MANUAL,
    channel_id: int | None = None,
    deleted_at: datetime | None = None,
) -> Meeting:
    host = host or make_user(db)
    meeting = Meeting(
        title=title,
        started_at=started_at or datetime(2026, 7, 24, 10, 0, tzinfo=UTC),
        duration_ms=duration_ms,
        host_id=host.id,
        status=status,
        source=source,
        channel_id=channel_id,
        deleted_at=deleted_at,
    )
    db.add(meeting)
    db.flush()
    return meeting


def make_participant(
    db: Session, meeting: Meeting, name: str, *, user: User | None = None
) -> Participant:
    participant = Participant(
        meeting_id=meeting.id, display_name=name, user_id=user.id if user else None
    )
    db.add(participant)
    db.flush()
    return participant


def make_tag(db: Session, name: str | None = None) -> Tag:
    tag = Tag(name=name or f"tag{_next()}")
    db.add(tag)
    db.flush()
    return tag


def tag_meeting(db: Session, meeting: Meeting, tag: Tag) -> None:
    db.add(MeetingTag(meeting_id=meeting.id, tag_id=tag.id))
    db.flush()


def make_speaker(db: Session, meeting: Meeting, label: str = "Speaker 1") -> Speaker:
    speaker = Speaker(meeting_id=meeting.id, label=label)
    db.add(speaker)
    db.flush()
    return speaker


def make_segment(
    db: Session, meeting: Meeting, speaker: Speaker, text: str, *, sequence: int = 0
) -> TranscriptSegment:
    segment = TranscriptSegment(
        meeting_id=meeting.id,
        speaker_id=speaker.id,
        sequence=sequence,
        start_ms=sequence * 1000,
        end_ms=sequence * 1000 + 900,
        text=text,
        original_text=text,
    )
    db.add(segment)
    db.flush()
    return segment


def make_action_item(
    db: Session,
    meeting: Meeting,
    *,
    status: ActionItemStatus = ActionItemStatus.OPEN,
    text: str = "Follow up",
) -> ActionItem:
    item = ActionItem(meeting_id=meeting.id, text=text, status=status)
    db.add(item)
    db.flush()
    return item
