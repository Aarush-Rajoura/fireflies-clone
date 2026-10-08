"""Error constructors shared by services so codes and messages stay identical."""

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.exceptions import (
    GoneError,
    NotFoundError,
    ServiceUnavailableError,
    ValidationFailedError,
)
from app.db.unit_of_work import UnitOfWork
from app.models import Meeting, TranscriptSegment, User


def meeting_not_found() -> NotFoundError:
    return NotFoundError("Meeting not found", code="MEETING_NOT_FOUND")


def meeting_deleted() -> GoneError:
    return GoneError("Meeting has been deleted", code="MEETING_DELETED")


def require_active_meeting(uow: UnitOfWork, meeting_id: int) -> Meeting:
    """The shared write/read guard: 404 for unknown ids, 410 for soft-deleted meetings."""
    meeting = uow.meetings.get(meeting_id, include_deleted=True)
    if meeting is None:
        raise meeting_not_found()
    if meeting.deleted_at is not None:
        raise meeting_deleted()
    return meeting


def require_segment_in_meeting(
    uow: UnitOfWork, meeting_id: int, segment_id: int
) -> TranscriptSegment:
    """A segment id from the client must be a line of this meeting's own transcript."""
    segment = uow.transcript.get_segment(segment_id)
    if segment is None or segment.meeting_id != meeting_id:
        raise ValidationFailedError(
            "Segment is not part of this meeting",
            code="SEGMENT_NOT_IN_MEETING",
            details={"segment_id": segment_id},
        )
    return segment


def require_current_user(uow: UnitOfWork) -> User:
    """Single tenant: the seeded default user acts for every request."""
    user = uow.users.get_default()
    if user is None:
        raise ServiceUnavailableError("Database has not been seeded", code="NOT_SEEDED")
    return user


def check_timezone(tz: str) -> ZoneInfo:
    """Date filters are local days in `tz`; an unknown zone name is a client error."""
    try:
        return ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise ValidationFailedError(
            "Unknown time zone", code="INVALID_TIMEZONE", details={"tz": tz}
        ) from exc
