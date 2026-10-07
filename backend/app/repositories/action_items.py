from collections.abc import Sequence

from sqlalchemy import func, select

from app.models import ActionItem
from app.models.enums import ActionItemStatus
from app.repositories.base import Repository


class ActionItemRepository(Repository[ActionItem]):
    model = ActionItem

    def list_for_meeting(
        self, meeting_id: int, status: ActionItemStatus | None = None
    ) -> list[ActionItem]:
        stmt = select(ActionItem).where(ActionItem.meeting_id == meeting_id)
        if status is not None:
            stmt = stmt.where(ActionItem.status == status)
        return list(self.session.scalars(stmt.order_by(ActionItem.sequence, ActionItem.id)))

    def page_for_meeting(
        self, meeting_id: int, limit: int, offset: int
    ) -> tuple[list[ActionItem], int]:
        where = ActionItem.meeting_id == meeting_id
        total = self.session.scalar(select(func.count()).select_from(ActionItem).where(where))
        stmt = (
            select(ActionItem)
            .where(where)
            .order_by(ActionItem.sequence, ActionItem.id)
            .limit(limit)
            .offset(offset)
        )
        return list(self.session.scalars(stmt)), total or 0

    def next_sequence(self, meeting_id: int) -> int:
        current = self.session.scalar(
            select(func.max(ActionItem.sequence)).where(ActionItem.meeting_id == meeting_id)
        )
        return 0 if current is None else current + 1

    def bulk_add(self, items: Sequence[ActionItem]) -> None:
        self.session.add_all(items)
        self.session.flush()
