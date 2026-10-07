from sqlalchemy import select

from app.models import Highlight
from app.repositories.base import Repository


class HighlightRepository(Repository[Highlight]):
    model = Highlight

    def list_for_meeting(self, meeting_id: int) -> list[Highlight]:
        stmt = select(Highlight).where(Highlight.meeting_id == meeting_id).order_by(Highlight.id)
        return list(self.session.scalars(stmt))
