"""Error constructors shared by services so codes and messages stay identical."""

from app.core.exceptions import GoneError, NotFoundError


def meeting_not_found() -> NotFoundError:
    return NotFoundError("Meeting not found", code="MEETING_NOT_FOUND")


def meeting_deleted() -> GoneError:
    return GoneError("Meeting has been deleted", code="MEETING_DELETED")
