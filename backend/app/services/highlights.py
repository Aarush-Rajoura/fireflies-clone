"""Highlight use cases: character ranges inside one transcript line of the meeting."""

from app.core.exceptions import NotFoundError, ValidationFailedError
from app.db.unit_of_work import UnitOfWork
from app.models import Highlight
from app.schemas.common import Page, PageParams
from app.schemas.highlight import HighlightCreate, HighlightRead, HighlightUpdate
from app.services.guards import (
    require_active_meeting,
    require_current_user,
    require_segment_in_meeting,
)


def _read(h: Highlight) -> HighlightRead:
    return HighlightRead(
        id=h.id,
        meeting_id=h.meeting_id,
        segment_id=h.segment_id,
        start_offset=h.start_offset,
        end_offset=h.end_offset,
        color=h.color,  # type: ignore[arg-type]  # only ever written from HighlightColor
        created_by=h.created_by,
    )


def _check_range(start: int, end: int, text: str) -> None:
    if not 0 <= start < end <= len(text):
        raise ValidationFailedError(
            "Highlight range is outside the segment text",
            code="HIGHLIGHT_OUT_OF_RANGE",
            details={"start_offset": start, "end_offset": end, "text_length": len(text)},
        )


class HighlightService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    def list(self, meeting_id: int, page: PageParams) -> Page[HighlightRead]:
        require_active_meeting(self.uow, meeting_id)
        rows, total = self.uow.highlights.page_for_meeting(meeting_id, page.page_size, page.offset)
        return Page(
            items=[_read(h) for h in rows], page=page.page, page_size=page.page_size, total=total
        )

    def create(self, meeting_id: int, data: HighlightCreate) -> HighlightRead:
        require_active_meeting(self.uow, meeting_id)
        segment = require_segment_in_meeting(self.uow, meeting_id, data.segment_id)
        _check_range(data.start_offset, data.end_offset, segment.text)
        highlight = self.uow.highlights.add(
            Highlight(
                meeting_id=meeting_id,
                segment_id=segment.id,
                created_by=require_current_user(self.uow).id,
                start_offset=data.start_offset,
                end_offset=data.end_offset,
                color=data.color,
            )
        )
        self.uow.commit()
        return _read(highlight)

    def update(self, highlight_id: int, data: HighlightUpdate) -> HighlightRead:
        highlight = self._get_writable(highlight_id)
        start = data.start_offset if data.start_offset is not None else highlight.start_offset
        end = data.end_offset if data.end_offset is not None else highlight.end_offset
        segment = self.uow.transcript.get_segment(highlight.segment_id)
        _check_range(start, end, segment.text if segment else "")
        highlight.start_offset, highlight.end_offset = start, end
        if data.color is not None:
            highlight.color = data.color
        self.uow.highlights.flush()
        self.uow.commit()
        return _read(highlight)

    def delete(self, highlight_id: int) -> None:
        self.uow.highlights.delete(self._get_writable(highlight_id))
        self.uow.commit()

    def _get_writable(self, highlight_id: int) -> Highlight:
        highlight = self.uow.highlights.get(highlight_id)
        if highlight is None:
            raise NotFoundError("Highlight not found", code="HIGHLIGHT_NOT_FOUND")
        require_active_meeting(self.uow, highlight.meeting_id)
        return highlight
