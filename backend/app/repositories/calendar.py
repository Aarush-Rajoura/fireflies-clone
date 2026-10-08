from datetime import datetime

from sqlalchemy import func, select, update

from app.models import CalendarConnection, Meeting
from app.models.enums import CalendarProvider
from app.repositories.base import Repository


class CalendarConnectionRepository(Repository[CalendarConnection]):
    model = CalendarConnection

    def get_for(self, user_id: int, provider: CalendarProvider) -> CalendarConnection | None:
        return self.session.scalar(
            select(CalendarConnection).where(
                CalendarConnection.user_id == user_id, CalendarConnection.provider == provider
            )
        )

    def list_for(
        self, user_id: int, limit: int, offset: int
    ) -> tuple[list[CalendarConnection], int]:
        where = CalendarConnection.user_id == user_id
        total = self.session.scalar(select(func.count()).where(where)) or 0
        stmt = (
            select(CalendarConnection)
            .where(where)
            .order_by(CalendarConnection.connected_at, CalendarConnection.id)
            .limit(limit)
            .offset(offset)
        )
        return list(self.session.scalars(stmt)), total

    def soft_delete_imported(
        self, host_id: int, provider: CalendarProvider, deleted_at: datetime
    ) -> int:
        """Soft-delete one provider's untouched imports for one host; returns the count.

        Imports are written with updated_at == created_at, so a later edit (which bumps
        updated_at) marks the row as the user's own and it survives the disconnect.
        """
        result = self.session.execute(
            update(Meeting)
            .where(
                Meeting.host_id == host_id,
                Meeting.calendar_provider == provider,
                Meeting.not_deleted(),
                Meeting.updated_at <= Meeting.created_at,
            )
            .values(deleted_at=deleted_at)
            .execution_options(synchronize_session="fetch")
        )
        return int(getattr(result, "rowcount", 0) or 0)
