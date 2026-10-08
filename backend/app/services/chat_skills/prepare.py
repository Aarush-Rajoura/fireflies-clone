import re
from collections import Counter

from app.db.unit_of_work import UnitOfWork
from app.models import Meeting, Participant
from app.models.enums import MeetingStatus
from app.schemas.chat import ChatSkillId
from app.services.chat_skills.base import ChatSkill, PreparedReply, SkillRequest
from app.services.chat_skills.compose import (
    ReplyBuilder,
    day,
    decision_points,
    first_sentences,
    item_line,
    names,
    text_reply,
    topic_words,
    when,
)
from app.services.guards import require_active_meeting

RELATED_LIMIT = 3
MAX_ITEMS = 8
# Past meetings considered when looking for related context.
HISTORY_DEPTH = 50
# A shared topic word in the title says more than one shared attendee.
TOPIC_WEIGHT = 3


def _person(p: Participant) -> str:
    return f"user:{p.user_id}" if p.user_id is not None else f"name:{p.display_name.lower()}"


class PrepareUpcomingSkill(ChatSkill):
    """A brief for the next scheduled meeting (or the @-mentioned one), built from past
    meetings that share its attendees or topic: their open items and key points."""

    id = ChatSkillId.PREPARE
    label = "Prepare me for the upcoming meeting"
    description = "A brief for your next meeting from related past meetings and open items."
    icon = "wand-sparkles"
    triggers = (
        re.compile(r"^\W*(please\s+)?(prepare|prep|brief)\s+me\b", re.I),
        re.compile(r"\b(upcoming|next) meeting\b", re.I),
    )

    def prepare(self, uow: UnitOfWork, request: SkillRequest) -> PreparedReply:
        upcoming = self._pick(uow, request)
        if upcoming is None:
            return PreparedReply.ready(
                text_reply(
                    "You have no upcoming meetings scheduled. Once one is on your calendar, "
                    "I can brief you on it."
                )
            )
        ctx = uow.chat_context
        attendees = ctx.participants([upcoming.id])[upcoming.id]
        others = [p for p in attendees if p.user_id != request.user_id]
        related = self._related(uow, request, upcoming, others)

        reply = ReplyBuilder()
        reply.heading(f"Prep: {upcoming.title}")
        meta = [f"**When:** {when(upcoming)}"]
        if others:
            meta.append(f"**With:** {names(p.display_name for p in others)}")
        reply.add(" · ".join(meta))
        if not related:
            reply.add(
                "",
                "I couldn't find earlier meetings with these attendees or on this topic, "
                "so there is no history to brief you on yet.",
            )
            return PreparedReply.ready(reply.build(uow))

        ids = [m.id for m in related]
        overviews = uow.summaries.overviews(ids)
        reply.heading("Context from related meetings", 3)
        for m in related:
            gist = first_sentences(overviews.get(m.id, ""), 2) or "No summary yet."
            marker = reply.cite(m.id, m.title, None, gist)
            reply.add(f"- **{m.title}** ({day(m.started_at)}): {gist} {marker}")

        items = ctx.open_items_for_meetings(ids)
        if items:
            reply.heading("Open action items to follow up", 3)
            today = request.now.date()
            for item in items[:MAX_ITEMS]:
                reply.add(item_line(item, request.user_id, reply.cite_item(item), today=today))

        sections = ctx.sections(ids)
        points = [(m, text, ms) for m in related for text, ms in decision_points(sections[m.id])]
        if points:
            reply.heading("Key points to revisit", 3)
            reply.add(
                *(f"- {text} {reply.cite(m.id, m.title, ms, text)}" for m, text, ms in points)
            )

        self._agenda(
            reply,
            uow,
            ids,
            # Your own items are already listed above; the agenda is about other people.
            items_by_owner=Counter(
                i.assignee for i in items if i.assignee and i.assignee_user_id != request.user_id
            ),
        )
        return PreparedReply.ready(reply.build(uow))

    def _pick(self, uow: UnitOfWork, request: SkillRequest) -> Meeting | None:
        if request.meeting_id is not None:
            meeting = require_active_meeting(uow, request.meeting_id)
            if meeting.status == MeetingStatus.SCHEDULED:
                return meeting
        return uow.chat_context.next_scheduled(request.now)

    @staticmethod
    def _related(
        uow: UnitOfWork, request: SkillRequest, upcoming: Meeting, others: list[Participant]
    ) -> list[Meeting]:
        """Past meetings ranked by shared attendees (other than you) and shared title topics."""
        history = uow.chat_context.recent_completed(request.now, HISTORY_DEPTH)
        if not history:
            return []
        people = uow.chat_context.participants([m.id for m in history])
        keywords = uow.summaries.keyword_terms([m.id for m in history])
        wanted_people = {_person(p) for p in others}
        wanted_topics = topic_words(upcoming.title)
        scored: list[tuple[int, Meeting]] = []
        for m in history:
            shared_people = wanted_people & {_person(p) for p in people[m.id]}
            topics = topic_words(" ".join([m.title, *keywords.get(m.id, [])]))
            score = len(shared_people) + TOPIC_WEIGHT * len(wanted_topics & topics)
            if score > 0:
                scored.append((score, m))
        # Stable sort keeps newest-first among equal scores.
        scored.sort(key=lambda s: -s[0])
        return [m for _, m in scored[:RELATED_LIMIT]]

    @staticmethod
    def _agenda(
        reply: ReplyBuilder, uow: UnitOfWork, ids: list[int], *, items_by_owner: Counter[str]
    ) -> None:
        terms = Counter(t for terms in uow.summaries.keyword_terms(ids).values() for t in terms[:4])
        agenda: list[str] = []
        if items_by_owner:
            owners = names((who for who, _ in items_by_owner.most_common()), 3)
            agenda.append(f"- Check progress on open items with {owners}")
        if terms:
            topics = ", ".join(t for t, _ in terms.most_common(4))
            agenda.append(f"- Recurring topics: {topics}")
        if agenda:
            reply.heading("Suggested agenda", 3)
            reply.add(*agenda)
