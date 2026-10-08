from sqlalchemy import func, select

from app.models import Soundbite
from app.repositories.base import Repository


class SoundbiteRepository(Repository[Soundbite]):
    model = Soundbite

    def page_for_meeting(
        self, meeting_id: int, limit: int, offset: int
    ) -> tuple[list[Soundbite], int]:
        """In recording order."""
        where = Soundbite.meeting_id == meeting_id
        total = self.session.scalar(select(func.count()).select_from(Soundbite).where(where))
        stmt = (
            select(Soundbite)
            .where(where)
            .order_by(Soundbite.start_ms, Soundbite.id)
            .limit(limit)
            .offset(offset)
        )
        return list(self.session.scalars(stmt)), total or 0
