"""Resolves a meeting's recording to a file on disk, strictly inside the media directory."""

import mimetypes
from dataclasses import dataclass
from pathlib import Path

from app.core.exceptions import NotFoundError
from app.db.unit_of_work import UnitOfWork
from app.models.enums import MediaType
from app.services.meetings import MeetingService

_MEDIA_PREFIX = "media/"


@dataclass(frozen=True)
class MediaFile:
    path: Path
    media_type: str


def _not_found() -> NotFoundError:
    return NotFoundError("This meeting has no recording", code="MEDIA_NOT_FOUND")


class MediaService:
    def __init__(self, uow: UnitOfWork, media_dir: Path) -> None:
        self.uow = uow
        self.media_dir = media_dir

    def resolve(self, meeting_id: int) -> MediaFile:
        meeting = MeetingService(self.uow).get_active_or_raise(meeting_id)
        if not meeting.media_url or meeting.media_type == MediaType.NONE:
            raise _not_found()
        relative = meeting.media_url.lstrip("/")
        relative = relative.removeprefix(_MEDIA_PREFIX)
        root = self.media_dir.resolve()
        # resolve() collapses ../ and follows symlinks, so the containment check sees the real path.
        path = (root / relative).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            raise _not_found()
        guessed, _ = mimetypes.guess_type(path.name)
        fallback = "video/mp4" if meeting.media_type == MediaType.VIDEO else "audio/mpeg"
        return MediaFile(path=path, media_type=guessed or fallback)
