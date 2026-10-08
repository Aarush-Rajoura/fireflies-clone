from sqlalchemy import func, select

from app.models import Highlight, TranscriptSegment
from app.repositories.base import Repository


class HighlightRepository(Repository[Highlight]):
    model = Highlight

    def list_for_meeting(self, meeting_id: int) -> list[Highlight]:
        stmt = select(Highlight).where(Highlight.meeting_id == meeting_id).order_by(Highlight.id)
        return list(self.session.scalars(stmt))

    def page_for_meeting(
        self, meeting_id: int, limit: int, offset: int
    ) -> tuple[list[Highlight], int]:
        """In transcript order, then by position inside the line."""
        where = Highlight.meeting_id == meeting_id
        total = self.session.scalar(select(func.count()).select_from(Highlight).where(where))
        stmt = (
            select(Highlight)
            .join(TranscriptSegment, TranscriptSegment.id == Highlight.segment_id)
            .where(where)
            .order_by(TranscriptSegment.sequence, Highlight.start_offset, Highlight.id)
            .limit(limit)
            .offset(offset)
        )
        return list(self.session.scalars(stmt)), total or 0
