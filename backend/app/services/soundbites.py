"""Soundbite use cases: short, titled clips of a meeting's recording."""

from app.core.exceptions import NotFoundError, ValidationFailedError
from app.db.unit_of_work import UnitOfWork
from app.models import Meeting, Soundbite
from app.schemas.common import Page, PageParams
from app.schemas.soundbite import SoundbiteCreate, SoundbiteRead
from app.services.guards import require_active_meeting, require_current_user

MIN_LENGTH_MS = 3_000
MAX_LENGTH_MS = 180_000
_TITLE_CHARS = 80


def _read(s: Soundbite) -> SoundbiteRead:
    return SoundbiteRead(
        id=s.id,
        meeting_id=s.meeting_id,
        title=s.title,
        start_ms=s.start_ms,
        end_ms=s.end_ms,
        duration_ms=s.end_ms - s.start_ms,
        created_by=s.created_by,
    )


def _clock(ms: int) -> str:
    minutes, seconds = divmod(ms // 1000, 60)
    return f"{minutes:02d}:{seconds:02d}"


class SoundbiteService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    def list(self, meeting_id: int, page: PageParams) -> Page[SoundbiteRead]:
        require_active_meeting(self.uow, meeting_id)
        rows, total = self.uow.soundbites.page_for_meeting(meeting_id, page.page_size, page.offset)
        return Page(
            items=[_read(s) for s in rows], page=page.page, page_size=page.page_size, total=total
        )

    def create(self, meeting_id: int, data: SoundbiteCreate) -> SoundbiteRead:
        meeting = require_active_meeting(self.uow, meeting_id)
        _check_bounds(meeting, data.start_ms, data.end_ms)
        soundbite = self.uow.soundbites.add(
            Soundbite(
                meeting_id=meeting_id,
                created_by=require_current_user(self.uow).id,
                title=data.title or self._default_title(meeting_id, data.start_ms, data.end_ms),
                start_ms=data.start_ms,
                end_ms=data.end_ms,
            )
        )
        self.uow.commit()
        return _read(soundbite)

    def delete(self, soundbite_id: int) -> None:
        soundbite = self.uow.soundbites.get(soundbite_id)
        if soundbite is None:
            raise NotFoundError("Soundbite not found", code="SOUNDBITE_NOT_FOUND")
        require_active_meeting(self.uow, soundbite.meeting_id)
        self.uow.soundbites.delete(soundbite)
        self.uow.commit()

    def _default_title(self, meeting_id: int, start_ms: int, end_ms: int) -> str:
        # The first line spoken inside the clip says more than a timestamp.
        for seg in self.uow.transcript.segments(meeting_id):
            if seg.end_ms > start_ms and seg.start_ms < end_ms and seg.text.strip():
                text = " ".join(seg.text.split())
                if len(text) > _TITLE_CHARS:
                    text = text[: _TITLE_CHARS - 1].rstrip() + "…"
                return text
        return f"Soundbite at {_clock(start_ms)}"


def _check_bounds(meeting: Meeting, start_ms: int, end_ms: int) -> None:
    length = end_ms - start_ms
    if not MIN_LENGTH_MS <= length <= MAX_LENGTH_MS:
        raise ValidationFailedError(
            "A soundbite must be between 3 seconds and 3 minutes long",
            code="SOUNDBITE_LENGTH_INVALID",
            details={"length_ms": length, "min_ms": MIN_LENGTH_MS, "max_ms": MAX_LENGTH_MS},
        )
    if end_ms > meeting.duration_ms:
        raise ValidationFailedError(
            "A soundbite must end within the recording",
            code="SOUNDBITE_OUT_OF_RANGE",
            details={"end_ms": end_ms, "duration_ms": meeting.duration_ms},
        )
