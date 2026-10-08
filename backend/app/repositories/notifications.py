from datetime import datetime

from sqlalchemy import func, select, update

from app.models import Notification
from app.repositories.base import Repository


class NotificationRepository(Repository[Notification]):
    model = Notification

    def get_for(self, user_id: int, notification_id: int) -> Notification | None:
        return self.session.scalar(
            select(Notification).where(
                Notification.id == notification_id, Notification.user_id == user_id
            )
        )

    def list_for(self, user_id: int, limit: int, offset: int) -> tuple[list[Notification], int]:
        where = Notification.user_id == user_id
        total = self.session.scalar(select(func.count()).where(where)) or 0
        stmt = (
            select(Notification)
            .where(where)
            # Unread first (NULL read_at sorts as 0), then newest; id breaks ties stably.
            .order_by(
                Notification.read_at.is_not(None),
                Notification.created_at.desc(),
                Notification.id.desc(),
            )
            .limit(limit)
            .offset(offset)
        )
        return list(self.session.scalars(stmt)), total

    def mark_all_read(self, user_id: int, read_at: datetime) -> None:
        self.session.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
            .values(read_at=read_at)
            .execution_options(synchronize_session="fetch")
        )
