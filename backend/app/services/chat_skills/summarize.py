import re

from app.db.unit_of_work import UnitOfWork
from app.models import Meeting, SummarySection
from app.models.enums import MeetingStatus, SectionKind
from app.schemas.chat import ChatSkillId
from app.services.chat_skills.base import ChatSkill, PreparedReply, SkillRequest
from app.services.chat_skills.compose import (
    ReplyBuilder,
    day,
    duration,
    item_line,
    names,
    text_reply,
    topic_words,
)
from app.services.guards import require_active_meeting

# Words of the request itself, so "summarize my last meeting" names no meeting.
_REQUEST_WORDS = frozenset(
    "summarize summarise summary recap tldr last latest recent previous most".split()
)
# How far back a question may reach to find a meeting by its title.
_TITLE_SEARCH_DEPTH = 100


class SummarizeMeetingSkill(ChatSkill):
    """The stored summary of the @-mentioned meeting, a meeting named in the question,
    or else the latest completed meeting. Reads the summary; never regenerates it."""

    id = ChatSkillId.SUMMARIZE
    label = "Summarize my last meeting"
    description = "Overview, key moments and open items from a meeting's stored summary."
    icon = "list-collapse"
    triggers = (
        re.compile(r"^\W*(please\s+)?(summari[sz]e|recap|tl;?dr)\b", re.I),
        re.compile(r"^\W*(give me |write )?an? (summary|recap) of\b", re.I),
    )

    def prepare(self, uow: UnitOfWork, request: SkillRequest) -> PreparedReply:
        meeting = self._pick(uow, request)
        if meeting is None:
            return PreparedReply.ready(
                text_reply("You don't have any completed meetings with a summary yet.")
            )
        if meeting.status != MeetingStatus.COMPLETED:
            return PreparedReply.ready(
                text_reply(
                    f"**{meeting.title}** hasn't happened yet ({day(meeting.started_at)}). "
                    "Ask me to prepare you for it instead."
                )
            )
        summary = uow.summaries.get_by_meeting(meeting.id)
        reply = ReplyBuilder()
        if summary is None or not summary.overview.strip():
            marker = reply.cite(meeting.id, meeting.title, None, meeting.title)
            reply.add(
                f"**{meeting.title}** doesn't have a summary yet {marker}. "
                "Open the meeting and generate one, then ask me again."
            )
            return PreparedReply.ready(reply.build(uow))

        people = [p.display_name for p in uow.chat_context.participants([meeting.id])[meeting.id]]
        reply.heading(meeting.title)
        meta = [day(meeting.started_at), duration(meeting.duration_ms)]
        if people:
            meta.append(f"with {names(people)}")
        reply.add(" · ".join(meta), "", summary.overview.strip())
        self._sections(reply, meeting, uow.chat_context.sections([meeting.id])[meeting.id])

        items = uow.chat_context.open_items_for_meetings([meeting.id])
        if items:
            reply.heading("Open action items", 3)
            reply.add(*(item_line(i, request.user_id, reply.cite_item(i)) for i in items))
        if summary.is_stale:
            reply.add("", "Note: the transcript changed after this summary was written.")
        return PreparedReply.ready(reply.build(uow))

    def _pick(self, uow: UnitOfWork, request: SkillRequest) -> Meeting | None:
        if request.meeting_id is not None:
            return require_active_meeting(uow, request.meeting_id)
        recent = uow.chat_context.recent_completed(
            request.now, _TITLE_SEARCH_DEPTH, with_summary=True
        )
        wanted = topic_words(request.question) - _REQUEST_WORDS
        if wanted:
            scored = [(len(wanted & topic_words(m.title)), m) for m in recent]
            best = max(scored, key=lambda s: s[0], default=(0, None))
            if best[0] > 0:
                return best[1]
        return recent[0] if recent else None

    @staticmethod
    def _sections(reply: ReplyBuilder, meeting: Meeting, sections: list[SummarySection]) -> None:
        """Notes grouped under their outline moment; outline alone when there are no notes."""
        outline = [s for s in sections if s.kind == SectionKind.OUTLINE]
        notes = [s for s in sections if s.kind == SectionKind.NOTES]
        starts = {s.title.strip().lower(): s.start_ms for s in outline}
        if notes:
            for note in notes:
                start = starts.get(note.title.strip().lower())
                marker = (
                    f" {reply.cite(meeting.id, meeting.title, start, note.title)}"
                    if start is not None
                    else ""
                )
                reply.heading(f"{note.title}{marker}", 3)
                reply.add(*(f"- {b.strip()}" for b in note.body.splitlines() if b.strip()))
        elif outline:
            reply.heading("Key moments", 3)
            for s in outline:
                reply.add(
                    f"- {s.title} {reply.cite(meeting.id, meeting.title, s.start_ms, s.title)}"
                )
