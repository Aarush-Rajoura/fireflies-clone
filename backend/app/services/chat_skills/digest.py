import re
from collections import Counter

from app.db.unit_of_work import UnitOfWork
from app.schemas.chat import ChatSkillId
from app.services.chat_skills.base import ChatSkill, PreparedReply, SkillRequest
from app.services.chat_skills.compose import (
    ReplyBuilder,
    day,
    decision_points,
    first_sentences,
    item_line,
    text_reply,
)

DIGEST_MEETINGS = 7
MAX_ITEMS = 10
MAX_THEMES = 6


class WeeklyDigestSkill(ChatSkill):
    """A digest of the last 7 completed meetings: what each was about, what was decided,
    recurring themes and what is still open."""

    id = ChatSkillId.DIGEST
    label = "Prepare weekly digest, based on my meetings"
    description = "Overviews, decisions, themes and open items from your last 7 meetings."
    icon = "calendar"
    triggers = (
        re.compile(r"\bdigest\b", re.I),
        re.compile(r"\bweekly (summary|recap|update)\b", re.I),
    )

    def prepare(self, uow: UnitOfWork, request: SkillRequest) -> PreparedReply:
        ctx = uow.chat_context
        meetings = ctx.recent_completed(request.now, DIGEST_MEETINGS)
        if not meetings:
            return PreparedReply.ready(
                text_reply("You don't have any completed meetings to build a digest from yet.")
            )
        ids = [m.id for m in meetings]
        overviews = uow.summaries.overviews(ids)
        sections = ctx.sections(ids)
        items = ctx.open_items_for_meetings(ids)
        span = f"{day(meetings[-1].started_at)} – {day(meetings[0].started_at)}"

        reply = ReplyBuilder()
        reply.heading("Your weekly digest")
        count = len(meetings)
        reply.add(
            f"**{count} meeting{'s' * (count != 1)}** ({span}) · "
            f"**{len(items)} open action item{'s' * (len(items) != 1)}**"
        )

        reply.heading("Meetings", 3)
        for m in meetings:
            gist = first_sentences(overviews.get(m.id, ""), 1) or "No summary yet."
            reply.add(
                f"- **{m.title}** ({day(m.started_at)}): {gist} "
                f"{reply.cite(m.id, m.title, None, gist)}"
            )

        decisions = [
            (m, text, ms) for m in meetings for text, ms in decision_points(sections[m.id], 1)
        ]
        if decisions:
            reply.heading("Decisions", 3)
            reply.add(
                *(f"- {text} {reply.cite(m.id, m.title, ms, text)}" for m, text, ms in decisions)
            )

        keywords = uow.summaries.keyword_terms(ids)
        themes = Counter(t for terms in keywords.values() for t in dict.fromkeys(terms[:5]))
        if themes:
            reply.heading("Recurring themes", 3)
            reply.add(
                " · ".join(
                    f"**{term}**" + (f" ({n} meetings)" if n > 1 else "")
                    for term, n in themes.most_common(MAX_THEMES)
                )
            )

        if items:
            reply.heading("Open action items", 3)
            today = request.now.date()
            for item in items[:MAX_ITEMS]:
                reply.add(item_line(item, request.user_id, reply.cite_item(item), today=today))
            if len(items) > MAX_ITEMS:
                reply.add("", f"…and {len(items) - MAX_ITEMS} more on the Tasks page.")
        return PreparedReply.ready(reply.build(uow))
