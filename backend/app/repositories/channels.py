from sqlalchemy import func, select, update

from app.models import Channel, Meeting
from app.repositories.base import Repository


class ChannelRepository(Repository[Channel]):
    model = Channel

    def get_by_slug(self, slug: str) -> Channel | None:
        return self.session.scalar(select(Channel).where(Channel.slug == slug))

    def list_with_counts(self, limit: int, offset: int) -> tuple[list[tuple[Channel, int]], int]:
        live = func.count(Meeting.id).filter(Meeting.not_deleted())
        stmt = (
            select(Channel, live)
            .outerjoin(Meeting, Meeting.channel_id == Channel.id)
            .group_by(Channel.id)
            .order_by(func.lower(Channel.name), Channel.id)
            .limit(limit)
            .offset(offset)
        )
        total = self.session.scalar(select(func.count()).select_from(Channel)) or 0
        return [(c, int(n)) for c, n in self.session.execute(stmt)], total

    def count_meetings(self, channel_id: int) -> int:
        stmt = select(func.count()).where(Meeting.channel_id == channel_id, Meeting.not_deleted())
        return self.session.scalar(stmt) or 0

    def delete(self, entity: Channel) -> None:
        # Explicit, so session state matches what ON DELETE SET NULL does in the database.
        self.session.execute(
            update(Meeting).where(Meeting.channel_id == entity.id).values(channel_id=None)
        )
        super().delete(entity)
