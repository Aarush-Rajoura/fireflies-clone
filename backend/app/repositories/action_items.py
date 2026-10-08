from collections.abc import Sequence
from datetime import date, timedelta

from sqlalchemy import ColumnElement, exists, func, or_, select

from app.models import ActionItem, Meeting, Participant
from app.models.enums import ActionItemStatus
from app.repositories.base import Repository
from app.schemas.action_item import TaskDue, TaskFilters

# "This week" is the rest of a rolling seven-day window that starts today.
WEEK_DAYS = 7


def _due_clause(due: TaskDue, today: date) -> ColumnElement[bool]:
    week_end = today + timedelta(days=WEEK_DAYS - 1)
    if due == "overdue":
        return ActionItem.due_date < today
    if due == "today":
        return ActionItem.due_date == today
    if due == "week":
        return ActionItem.due_date.between(today + timedelta(days=1), week_end)
    if due == "later":
        return ActionItem.due_date > week_end
    return ActionItem.due_date.is_(None)


def _mine_clause(user_id: int) -> ColumnElement[bool]:
    return or_(
        ActionItem.assignee_user_id == user_id,
        ActionItem.created_by_user_id == user_id,
        exists().where(
            Participant.id == ActionItem.assignee_participant_id,
            Participant.user_id == user_id,
        ),
    )


def _not_in_deleted_meeting() -> ColumnElement[bool]:
    return or_(
        ActionItem.meeting_id.is_(None),
        exists().where(Meeting.id == ActionItem.meeting_id, Meeting.not_deleted()),
    )


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

    def page_tasks(
        self, filters: TaskFilters, *, user_id: int, today: date, limit: int, offset: int
    ) -> tuple[list[ActionItem], int]:
        """Items across every live meeting plus standalone ones, soonest due first.

        `today` is the caller's local day, so due buckets follow the viewer's time zone.
        """
        conds: list[ColumnElement[bool]] = [_not_in_deleted_meeting()]
        if filters.scope == "mine":
            conds.append(_mine_clause(user_id))
        if filters.status is not None:
            conds.append(ActionItem.status == ActionItemStatus(filters.status))
        if filters.due is not None:
            conds.append(_due_clause(filters.due, today))
        if filters.q and filters.q.strip():
            conds.append(ActionItem.text.icontains(filters.q.strip(), autoescape=True))
        total = self.session.scalar(select(func.count()).select_from(ActionItem).where(*conds))
        stmt = (
            select(ActionItem)
            .where(*conds)
            .order_by(
                ActionItem.due_date.is_(None),
                ActionItem.due_date,
                ActionItem.created_at.desc(),
                ActionItem.id.desc(),
            )
            .limit(limit)
            .offset(offset)
        )
        return list(self.session.scalars(stmt)), total or 0

    def next_sequence(self, meeting_id: int | None) -> int:
        # Standalone tasks share one sequence space (meeting_id IS NULL).
        scope = (
            ActionItem.meeting_id.is_(None)
            if meeting_id is None
            else ActionItem.meeting_id == meeting_id
        )
        current = self.session.scalar(select(func.max(ActionItem.sequence)).where(scope))
        return 0 if current is None else current + 1

    def bulk_add(self, items: Sequence[ActionItem]) -> None:
        self.session.add_all(items)
        self.session.flush()
