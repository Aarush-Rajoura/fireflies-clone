"""ActionItem -> ActionItemRead, with batched lookups so a page costs a fixed few queries."""

from collections.abc import Sequence

from app.db.unit_of_work import UnitOfWork
from app.models import ActionItem
from app.schemas.action_item import ActionItemRead, AssigneeRead, AssigneeUserRead, MeetingRef


def action_item_reads(uow: UnitOfWork, items: Sequence[ActionItem]) -> list[ActionItemRead]:
    titles = uow.meetings.titles(sorted({i.meeting_id for i in items if i.meeting_id}))
    people = uow.participants.get_many(
        sorted({i.assignee_participant_id for i in items if i.assignee_participant_id})
    )
    users = uow.users.get_many(sorted({i.assignee_user_id for i in items if i.assignee_user_id}))
    reads: list[ActionItemRead] = []
    for item in items:
        who = people.get(item.assignee_participant_id) if item.assignee_participant_id else None
        user = users.get(item.assignee_user_id) if item.assignee_user_id else None
        title = titles.get(item.meeting_id) if item.meeting_id else None
        reads.append(
            ActionItemRead(
                id=item.id,
                meeting_id=item.meeting_id,
                meeting=(
                    MeetingRef(id=item.meeting_id, title=title)
                    if item.meeting_id and title is not None
                    else None
                ),
                text=item.text,
                status=item.status,
                assignee=AssigneeRead(id=who.id, display_name=who.display_name) if who else None,
                assignee_user=AssigneeUserRead(id=user.id, name=user.name) if user else None,
                due_date=item.due_date,
                completed_at=item.completed_at,
                source=item.source,
                start_ms=item.start_ms,
            )
        )
    return reads


def action_item_read(uow: UnitOfWork, item: ActionItem) -> ActionItemRead:
    return action_item_reads(uow, [item])[0]
