"""Grounded Q&A over one meeting's transcript, or over search hits across meetings.

Passages are read in a short transaction that is ended before the AI call, so a
slow provider never holds a database lock (see ADR-004).
"""

from collections.abc import Callable, Sequence

from app.ai.interfaces import QuestionAnswerer
from app.ai.types import Answer, Passage
from app.db.search import search_any_words
from app.db.unit_of_work import UnitOfWork
from app.schemas.ask import AskCitation, AskResponse
from app.services.guards import require_active_meeting
from app.services.transcript_text import build_transcript_for_ai

# Enough context to answer from, small enough to stay inside one LLM prompt.
MAX_CROSS_PASSAGES = 40
_QUOTE_CHARS = 220
NO_ANSWER_MEETING = "I couldn't find that in this meeting."
NO_ANSWER_MEETINGS = "I couldn't find that in your meetings."


def _clip(text: str) -> str:
    text = " ".join(text.split())
    return text if len(text) <= _QUOTE_CHARS else text[: _QUOTE_CHARS - 1].rstrip() + "…"


def _not_found(message: str) -> AskResponse:
    # Nothing to ground an answer in: answer without calling the AI or spending rate-limit quota.
    return AskResponse(answer=message, citations=[], provider=None, model=None)


class AskService:
    def __init__(self, uow: UnitOfWork, answerer: QuestionAnswerer) -> None:
        self.uow = uow
        self.answerer = answerer

    def ask_meeting(
        self, meeting_id: int, question: str, *, before_ai: Callable[[], None] | None = None
    ) -> AskResponse:
        """`before_ai` (the rate limiter) runs after every guard, so rejected requests are free."""
        try:
            passages = self._meeting_passages(meeting_id)
            if not passages:
                return _not_found(NO_ANSWER_MEETING)
            if before_ai is not None:
                before_ai()
        finally:
            self.uow.rollback()
        return _response(self.answerer.answer(question, passages), passages)

    def ask_across(
        self,
        question: str,
        meeting_ids: Sequence[int] | None = None,
        *,
        before_ai: Callable[[], None] | None = None,
    ) -> AskResponse:
        try:
            passages = self._search_passages(question, meeting_ids)
            if not passages:
                return _not_found(NO_ANSWER_MEETINGS)
            if before_ai is not None:
                before_ai()
        finally:
            self.uow.rollback()
        return _response(self.answerer.answer(question, passages), passages)

    def _meeting_passages(self, meeting_id: int) -> list[Passage]:
        meeting = require_active_meeting(self.uow, meeting_id)
        segments = self.uow.transcript.segments(meeting_id)
        if not segments:
            return []
        transcript = build_transcript_for_ai(
            meeting,
            segments,
            self.uow.transcript.speakers(meeting_id),
            self.uow.participants.list_for_meeting(meeting_id),
        )
        return [
            Passage(
                meeting_id=meeting.id,
                meeting_title=meeting.title,
                segment_id=line.segment_id,
                start_ms=line.start_ms,
                speaker=line.speaker,
                text=line.text,
            )
            for line in transcript.lines
        ]

    def _search_passages(self, question: str, meeting_ids: Sequence[int] | None) -> list[Passage]:
        """Best FTS hits first, then the summaries of the meetings they came from."""
        hits = search_any_words(
            self.uow.session, question, meeting_ids=meeting_ids, limit=MAX_CROSS_PASSAGES
        )
        passages = [
            Passage(
                h.meeting_id, h.meeting_title, h.segment_id, h.start_ms, h.speaker_label, h.text
            )
            for h in hits
        ]
        titles = {h.meeting_id: h.meeting_title for h in hits}
        overviews = self.uow.summaries.overviews(list(titles))
        passages += [
            Passage(mid, titles[mid], None, None, None, overviews[mid])
            for mid in titles
            if overviews.get(mid, "").strip()
        ]
        return passages


def _response(answer: Answer, passages: list[Passage]) -> AskResponse:
    """Keep only citations that point at a passage we supplied; anything else is invented."""
    by_segment = {p.segment_id: p for p in passages if p.segment_id is not None}
    citations: list[AskCitation] = []
    for cite in answer.citations:
        source = by_segment.get(cite.segment_id)
        if source is None or source.start_ms is None:
            continue
        if any(c.segment_id == cite.segment_id for c in citations):
            continue
        citations.append(
            AskCitation(
                meeting_id=source.meeting_id,
                meeting_title=source.meeting_title,
                segment_id=cite.segment_id,
                start_ms=source.start_ms,
                quote=_clip(cite.quote.strip() or source.text),
            )
        )
    return AskResponse(
        answer=answer.text, citations=citations, provider=answer.provider, model=answer.model
    )
