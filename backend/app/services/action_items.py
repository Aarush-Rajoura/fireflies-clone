"""Action-item use cases.

Items either belong to a meeting (assignees are that meeting's participants and the
meeting's soft-delete makes them read-only) or are standalone tasks with no meeting.
"""

from collections.abc import Callable
from datetime import UTC, datetime

from app.core.exceptions import NotFoundError, ValidationFailedError
from app.db.unit_of_work import UnitOfWork
from app.models import ActionItem
from app.models.enums import ActionItemSource, ActionItemStatus
from app.schemas.action_item import (
    ActionItemCreate,
    ActionItemRead,
    ActionItemUpdate,
    TaskCreate,
    TaskFilters,
)
from app.schemas.common import Page, PageParams
from app.services.action_item_mapping import action_item_read, action_item_reads
from app.services.guards import check_timezone, require_active_meeting, require_current_user
from app.services.notifications import NotificationService

Clock = Callable[[], datetime]


def _utc_now() -> datetime:
    return datetime.now(UTC)


class ActionItemService:
    def __init__(
        self,
        uow: UnitOfWork,
        clock: Clock = _utc_now,
        *,
        notifications: NotificationService | None = None,
    ) -> None:
        self.uow = uow
        self.clock = clock
        self.notifications = notifications

    def list(self, meeting_id: int, page: PageParams) -> Page[ActionItemRead]:
        require_active_meeting(self.uow, meeting_id)
        items, total = self.uow.action_items.page_for_meeting(
            meeting_id, page.page_size, page.offset
        )
        return Page(
            items=action_item_reads(self.uow, items),
            page=page.page,
            page_size=page.page_size,
            total=total,
        )

    def list_tasks(self, filters: TaskFilters, page: PageParams) -> Page[ActionItemRead]:
        """Every live item, optionally only the current user's, bucketed by local due day."""
        zone = check_timezone(filters.tz)
        user = require_current_user(self.uow)
        items, total = self.uow.action_items.page_tasks(
            filters,
            user_id=user.id,
            today=self.clock().astimezone(zone).date(),
            limit=page.page_size,
            offset=page.offset,
        )
        return Page(
            items=action_item_reads(self.uow, items),
            page=page.page,
            page_size=page.page_size,
            total=total,
        )

    def create(self, meeting_id: int, data: ActionItemCreate) -> ActionItemRead:
        """Append a manual item after the existing ones.

        The next sequence is read-then-written, so two concurrent creates can get the
        same number; nothing is unique on it, and every list orders by (sequence, id).
        """
        meeting = require_active_meeting(self.uow, meeting_id)
        self._check_assignee(meeting_id, data.assignee_participant_id)
        item = self._add(
            meeting_id,
            text=data.text,
            assignee_participant_id=data.assignee_participant_id,
            due_date=data.due_date,
            start_ms=data.start_ms,
        )
        self.uow.commit()
        self._notify_if_mine(item, meeting.title, previous_assignee=None)
        return action_item_read(self.uow, item)

    def create_task(self, data: TaskCreate) -> ActionItemRead:
        meeting = None
        if data.meeting_id is not None:
            meeting = require_active_meeting(self.uow, data.meeting_id)
        self._check_assignee(data.meeting_id, data.assignee_participant_id)
        self._check_assignee_user(data.assignee_user_id)
        item = self._add(
            data.meeting_id,
            text=data.text,
            assignee_participant_id=data.assignee_participant_id,
            assignee_user_id=data.assignee_user_id,
            due_date=data.due_date,
        )
        self.uow.commit()
        if meeting is not None:
            self._notify_if_mine(item, meeting.title, previous_assignee=None)
        return action_item_read(self.uow, item)

    def update(self, item_id: int, data: ActionItemUpdate) -> ActionItemRead:
        item = self._get_writable(item_id)
        previous_assignee = item.assignee_participant_id
        fields = data.model_fields_set
        if "text" in fields and data.text is not None:
            item.text = data.text
        if "assignee_participant_id" in fields:
            self._check_assignee(item.meeting_id, data.assignee_participant_id)
            item.assignee_participant_id = data.assignee_participant_id
        if "assignee_user_id" in fields:
            self._check_assignee_user(data.assignee_user_id)
            item.assignee_user_id = data.assignee_user_id
        if "due_date" in fields:
            item.due_date = data.due_date
        if data.status is not None:
            self._set_status(item, data.status)
        self.uow.action_items.flush()
        self.uow.commit()
        meeting = self.uow.meetings.get(item.meeting_id) if item.meeting_id is not None else None
        if meeting is not None:
            self._notify_if_mine(item, meeting.title, previous_assignee=previous_assignee)
        return action_item_read(self.uow, item)

    def delete(self, item_id: int) -> None:
        self.uow.action_items.delete(self._get_writable(item_id))
        self.uow.commit()

    def _notify_if_mine(
        self, item: ActionItem, meeting_title: str, *, previous_assignee: int | None
    ) -> None:
        """After commit: the bell rings only when an item newly lands on someone."""
        assignee = item.assignee_participant_id
        if (
            self.notifications is None
            or item.meeting_id is None
            or assignee is None
            or assignee == previous_assignee
        ):
            return
        self.notifications.notify_action_item_assigned(
            item.meeting_id, meeting_title, item.text, assignee
        )

    def _add(self, meeting_id: int | None, **fields: object) -> ActionItem:
        # Creator is best-effort: an unseeded database still accepts meeting items.
        creator = self.uow.users.get_default()
        return self.uow.action_items.add(
            ActionItem(
                meeting_id=meeting_id,
                status=ActionItemStatus.OPEN,
                source=ActionItemSource.MANUAL,
                sequence=self.uow.action_items.next_sequence(meeting_id),
                created_by_user_id=creator.id if creator else None,
                **fields,
            )
        )

    def _get_writable(self, item_id: int) -> ActionItem:
        item = self.uow.action_items.get(item_id)
        if item is None:
            raise NotFoundError("Action item not found", code="ACTION_ITEM_NOT_FOUND")
        if item.meeting_id is not None:
            require_active_meeting(self.uow, item.meeting_id)
        return item

    def _check_assignee(self, meeting_id: int | None, participant_id: int | None) -> None:
        if participant_id is None:
            return
        who = self.uow.participants.get(participant_id)
        # A standalone task has no participants, so any participant id is rejected.
        if who is None or meeting_id is None or who.meeting_id != meeting_id:
            raise ValidationFailedError(
                "Assignee is not a participant of this meeting",
                code="ASSIGNEE_NOT_IN_MEETING",
                details={"assignee_participant_id": participant_id},
            )

    def _check_assignee_user(self, user_id: int | None) -> None:
        if user_id is not None and self.uow.users.get(user_id) is None:
            raise ValidationFailedError(
                "Assignee user does not exist",
                code="ASSIGNEE_USER_NOT_FOUND",
                details={"assignee_user_id": user_id},
            )

    @staticmethod
    def _set_status(item: ActionItem, status: ActionItemStatus) -> None:
        # Re-completing keeps the original timestamp; reopening forgets it.
        if status == ActionItemStatus.COMPLETED and item.status != ActionItemStatus.COMPLETED:
            item.completed_at = datetime.now(UTC)
        elif status == ActionItemStatus.OPEN:
            item.completed_at = None
        item.status = status
