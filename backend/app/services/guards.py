"""Error constructors shared by services so codes and messages stay identical."""

from app.core.exceptions import GoneError, NotFoundError
from app.db.unit_of_work import UnitOfWork
from app.models import Meeting


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
