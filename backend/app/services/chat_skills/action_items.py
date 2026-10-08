import re
from datetime import timedelta

from app.db.unit_of_work import UnitOfWork
from app.schemas.chat import ChatSkillId
from app.services.chat_skills.base import ChatSkill, PreparedReply, SkillRequest
from app.services.chat_skills.compose import ReplyBuilder, day, item_line, text_reply

MAX_ITEMS = 25


class ActionItemsThisWeekSkill(ChatSkill):
    """Open action items due this week or raised in the last 7 days. A query, not AI."""

    id = ChatSkillId.ACTION_ITEMS
    label = "List my action items & todos for this week"
    description = "Open action items due this week or raised in your last 7 days of meetings."
    icon = "list-checks"
    triggers = (
        re.compile(r"^\W*(list|show|what are)\b.*\b(action items?|to-?dos?|tasks)\b", re.I),
        re.compile(r"\b(action items?|to-?dos?)\b.*\bthis week\b", re.I),
    )

    def prepare(self, uow: UnitOfWork, request: SkillRequest) -> PreparedReply:
        today = request.now.date()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        items = uow.chat_context.open_items_this_week(
            week_start, week_end, request.now - timedelta(days=7)
        )
        if not items:
            return PreparedReply.ready(
                text_reply(
                    "You're all caught up: no open action items are due this week "
                    f"({day(week_start)} – {day(week_end)}) or came up in the last 7 days."
                )
            )

        due = [i for i in items if i.due_date is not None and week_start <= i.due_date <= week_end]
        due_ids = {i.id for i in due}
        raised = [i for i in items if i.id not in due_ids]
        mine = sum(1 for i in items if i.assignee_user_id == request.user_id)
        meetings = len({i.meeting_id for i in items})

        reply = ReplyBuilder()
        reply.heading(f"Your action items for this week ({day(week_start)} – {day(week_end)})")
        reply.add(
            f"**{len(items)} open** across {meetings} meeting{'s' * (meetings != 1)}"
            f", **{mine}** assigned to you."
        )
        shown = 0
        for title, group in (("Due this week", due), ("Also raised in the last 7 days", raised)):
            group = group[: max(MAX_ITEMS - shown, 0)]
            if not group:
                continue
            reply.heading(title, 3)
            reply.add(
                *(item_line(i, request.user_id, reply.cite_item(i), today=today) for i in group)
            )
            shown += len(group)
        if len(items) > shown:
            reply.add("", f"…and {len(items) - shown} more on the Tasks page.")
        return PreparedReply.ready(reply.build(uow))
