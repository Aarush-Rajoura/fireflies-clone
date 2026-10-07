from sqlalchemy import select

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
