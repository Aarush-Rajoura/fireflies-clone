"""Action-item use cases. Assignees are always participants of the item's own meeting."""

from datetime import UTC, datetime

from app.core.exceptions import NotFoundError, ValidationFailedError
from app.db.unit_of_work import UnitOfWork
from app.models import ActionItem, Participant
from app.models.enums import ActionItemSource, ActionItemStatus
from app.schemas.action_item import (
    ActionItemCreate,
    ActionItemRead,
    ActionItemUpdate,
    AssigneeRead,
)
from app.schemas.common import Page, PageParams
from app.services.guards import require_active_meeting
from app.services.notifications import NotificationService


def action_item_read(item: ActionItem, participants: dict[int, Participant]) -> ActionItemRead:
    who = participants.get(item.assignee_participant_id) if item.assignee_participant_id else None
    return ActionItemRead(
        id=item.id,
        meeting_id=item.meeting_id,
        text=item.text,
        status=item.status,
        assignee=AssigneeRead(id=who.id, display_name=who.display_name) if who else None,
        due_date=item.due_date,
        completed_at=item.completed_at,
        source=item.source,
        start_ms=item.start_ms,
    )


class ActionItemService:
    def __init__(
        self, uow: UnitOfWork, *, notifications: NotificationService | None = None
    ) -> None:
        self.uow = uow
        self.notifications = notifications

    def list(self, meeting_id: int, page: PageParams) -> Page[ActionItemRead]:
        require_active_meeting(self.uow, meeting_id)
        items, total = self.uow.action_items.page_for_meeting(
            meeting_id, page.page_size, page.offset
        )
        people = self._participants(meeting_id)
        return Page(
            items=[action_item_read(i, people) for i in items],
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
        item = self.uow.action_items.add(
            ActionItem(
                meeting_id=meeting_id,
                text=data.text,
                assignee_participant_id=data.assignee_participant_id,
                due_date=data.due_date,
                start_ms=data.start_ms,
                status=ActionItemStatus.OPEN,
                source=ActionItemSource.MANUAL,
                sequence=self.uow.action_items.next_sequence(meeting_id),
            )
        )
        self.uow.commit()
        self._notify_if_mine(item, meeting.title, previous_assignee=None)
        return action_item_read(item, self._participants(meeting_id))

    def update(self, item_id: int, data: ActionItemUpdate) -> ActionItemRead:
        item = self._get_writable(item_id)
        previous_assignee = item.assignee_participant_id
        fields = data.model_fields_set
        if "text" in fields and data.text is not None:
            item.text = data.text
        if "assignee_participant_id" in fields:
            self._check_assignee(item.meeting_id, data.assignee_participant_id)
            item.assignee_participant_id = data.assignee_participant_id
        if "due_date" in fields:
            item.due_date = data.due_date
        if data.status is not None:
            self._set_status(item, data.status)
        self.uow.action_items.flush()
        self.uow.commit()
        meeting = self.uow.meetings.get(item.meeting_id)
        if meeting is not None:
            self._notify_if_mine(item, meeting.title, previous_assignee=previous_assignee)
        return action_item_read(item, self._participants(item.meeting_id))

    def delete(self, item_id: int) -> None:
        self.uow.action_items.delete(self._get_writable(item_id))
        self.uow.commit()

    def _notify_if_mine(
        self, item: ActionItem, meeting_title: str, *, previous_assignee: int | None
    ) -> None:
        """After commit: the bell rings only when an item newly lands on someone."""
        assignee = item.assignee_participant_id
        if self.notifications is None or assignee is None or assignee == previous_assignee:
            return
        self.notifications.notify_action_item_assigned(
            item.meeting_id, meeting_title, item.text, assignee
        )

    def _get_writable(self, item_id: int) -> ActionItem:
        item = self.uow.action_items.get(item_id)
        if item is None:
            raise NotFoundError("Action item not found", code="ACTION_ITEM_NOT_FOUND")
        require_active_meeting(self.uow, item.meeting_id)
        return item

    def _check_assignee(self, meeting_id: int, participant_id: int | None) -> None:
        if participant_id is None:
            return
        who = self.uow.participants.get(participant_id)
        if who is None or who.meeting_id != meeting_id:
            raise ValidationFailedError(
                "Assignee is not a participant of this meeting",
                code="ASSIGNEE_NOT_IN_MEETING",
                details={"assignee_participant_id": participant_id},
            )

    @staticmethod
    def _set_status(item: ActionItem, status: ActionItemStatus) -> None:
        # Re-completing keeps the original timestamp; reopening forgets it.
        if status == ActionItemStatus.COMPLETED and item.status != ActionItemStatus.COMPLETED:
            item.completed_at = datetime.now(UTC)
        elif status == ActionItemStatus.OPEN:
            item.completed_at = None
        item.status = status

    def _participants(self, meeting_id: int) -> dict[int, Participant]:
        return {p.id: p for p in self.uow.participants.list_for_meeting(meeting_id)}
