"""Building blocks for skills that write their reply from stored data, without an AI."""

import re
from collections.abc import Iterable
from datetime import date, datetime

from app.db.unit_of_work import UnitOfWork
from app.models import Meeting, SummarySection
from app.models.enums import SectionKind
from app.repositories.chat_context import OpenItem
from app.services.chat_skills.base import SkillReply, Source

QUOTE_CHARS = 220
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9])")
# Glue words that say nothing about a meeting's topic.
STOPWORDS = frozenset(
    """a an and any are as at be by can did do does for from had has have how i in is it its
    me my of on or our so that the their them there these they this to us was we were what
    when where which who why will with would you your about into over just than then also
    meeting meetings call sync please give tell show""".split()
)
_WORD = re.compile(r"[\w.]+", re.UNICODE)


_DECISION = re.compile(
    r"\b(decision|decide|decided|agreed|agreement|outcome|next steps?|conclusion|go/no-go)\b", re.I
)


def decision_points(sections: list[SummarySection], limit: int = 2) -> list[tuple[str, int | None]]:
    """(bullet, start_ms) from the notes about decisions, or else the closing notes group,
    which is where meetings usually land. The moment comes from the matching outline entry."""
    notes = [s for s in sections if s.kind == SectionKind.NOTES and s.body.strip()]
    if not notes:
        return []
    starts = {
        s.title.strip().lower(): s.start_ms for s in sections if s.kind == SectionKind.OUTLINE
    }
    chosen = [n for n in notes if _DECISION.search(n.title)] or [notes[-1]]
    points: list[tuple[str, int | None]] = []
    for note in chosen:
        bullets = [b.strip() for b in note.body.splitlines() if b.strip()]
        # The last bullets of a decision group carry the verdict; earlier ones restate context.
        points += [(b, starts.get(note.title.strip().lower())) for b in bullets[-limit:]]
    return points[:limit]


def clip(text: str, limit: int = QUOTE_CHARS) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def first_sentences(text: str, count: int = 1, limit: int = 260) -> str:
    sentences = _SENTENCE_END.split(" ".join(text.split()))
    return clip(" ".join(sentences[:count]), limit)


def topic_words(text: str) -> set[str]:
    words = (w.strip(".").lower() for w in _WORD.findall(text))
    return {w for w in words if len(w) > 2 and w not in STOPWORDS}


def day(value: date | datetime) -> str:
    """`Thu, Oct 9`: dates in replies are for reading, not parsing."""
    return f"{value:%a}, {value:%b} {value.day}"


def when(meeting: Meeting) -> str:
    return f"{day(meeting.started_at)} at {meeting.started_at:%H:%M} UTC"


def duration(ms: int) -> str:
    minutes = round(ms / 60_000)
    if minutes < 60:
        return f"{max(minutes, 1)} min"
    hours, rest = divmod(minutes, 60)
    return f"{hours} h {rest} min" if rest else f"{hours} h"


def names(people: Iterable[str], limit: int = 5) -> str:
    people = list(people)
    shown = ", ".join(people[:limit])
    return f"{shown} +{len(people) - limit}" if len(people) > limit else shown


def owner(item: OpenItem, user_id: int) -> str:
    if item.assignee is None:
        return "Unassigned"
    return "You" if item.assignee_user_id == user_id else item.assignee


def item_line(item: OpenItem, user_id: int, marker: str, *, today: date | None = None) -> str:
    parts = [f"**{owner(item, user_id)}**"]
    if item.due_date is not None:
        overdue = today is not None and item.due_date < today
        parts.append(f"{'overdue since' if overdue else 'due'} {day(item.due_date)}")
    return f"- {item.text} — {' · '.join(parts)} {marker}"


class ReplyBuilder:
    """Accumulates markdown-lite lines and numbered sources.

    `cite` returns a `[n]` marker for the text; the same moment cited twice gets
    the same number. `build` resolves each moment to the transcript line playing
    then, so a citation always names a real segment when one exists.
    """

    def __init__(self) -> None:
        self.lines: list[str] = []
        self._keys: dict[tuple[int, int | None], int] = {}
        self._pending: list[tuple[int, str, int | None, str]] = []

    def add(self, *lines: str) -> None:
        self.lines.extend(lines)

    def heading(self, text: str, level: int = 2) -> None:
        if self.lines:
            self.lines.append("")
        self.lines.append(f"{'#' * level} {text}")

    def cite(self, meeting_id: int, title: str, start_ms: int | None, quote: str) -> str:
        key = (meeting_id, start_ms)
        if key not in self._keys:
            self._pending.append((meeting_id, title, start_ms, quote))
            self._keys[key] = len(self._pending)
        return f"[{self._keys[key]}]"

    def cite_item(self, item: OpenItem) -> str:
        return self.cite(item.meeting_id, item.meeting_title, item.start_ms, item.text)

    def build(self, uow: UnitOfWork) -> SkillReply:
        timed = [(mid, ms) for mid, _, ms, _ in self._pending if ms is not None]
        lines = uow.chat_context.segments_at(timed)
        sources: list[Source] = []
        for mid, title, ms, quote in self._pending:
            segment = lines.get((mid, ms)) if ms is not None else None
            sources.append(
                Source(
                    meeting_id=mid,
                    meeting_title=title,
                    segment_id=segment.segment_id if segment else None,
                    start_ms=ms,
                    quote=clip(segment.text if segment else quote),
                )
            )
        return SkillReply(content="\n".join(self.lines).strip(), sources=sources)


def text_reply(*lines: str) -> SkillReply:
    return SkillReply(content="\n".join(lines))
