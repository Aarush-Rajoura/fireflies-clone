"""Summary reads and regeneration. The AI call always runs with no transaction open."""

import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError

from app.ai.interfaces import Summarizer
from app.ai.types import SummaryResult, TranscriptForAI
from app.core.exceptions import ConflictError, ValidationFailedError
from app.db.unit_of_work import UnitOfWork
from app.models import Keyword, Meeting, Summary, SummarySection
from app.models.enums import SectionKind
from app.schemas.summary import NoteGroupRead, OutlineEntryRead, SummaryRead
from app.services import timeline
from app.services.guards import require_active_meeting
from app.services.meeting_mapping import GENERATING_CLAIM_TTL
from app.services.transcript_text import build_transcript_for_ai

SECTION_TITLE_MAX = 300
KEYWORD_MAX = 100

logger = logging.getLogger(__name__)

_EMPTY = SummaryRead(
    overview="",
    keywords=[],
    outline=[],
    notes=[],
    provider=None,
    model=None,
    generated_at=None,
    is_stale=False,
)


def _generating() -> ConflictError:
    return ConflictError("A summary is already being generated", code="SUMMARY_GENERATING")


@dataclass(frozen=True)
class _Claim:
    summary: Summary
    # The generating_since value we wrote: proof of ownership for every later write.
    token: datetime
    created: bool
    transcript: TranscriptForAI
    starts: list[int]


class SummaryService:
    def __init__(self, uow: UnitOfWork, summarizer: Summarizer) -> None:
        self.uow = uow
        self.summarizer = summarizer

    def get(self, meeting_id: int) -> SummaryRead:
        require_active_meeting(self.uow, meeting_id)
        summary = self.uow.summaries.get_by_meeting(meeting_id)
        if summary is None:
            return _EMPTY.model_copy()
        sections = self.uow.summaries.sections(summary.id)
        return SummaryRead(
            overview=summary.overview,
            keywords=self.uow.summaries.keyword_terms([meeting_id]).get(meeting_id, []),
            outline=[
                OutlineEntryRead(title=s.title, start_ms=s.start_ms)
                for s in sections
                if s.kind == SectionKind.OUTLINE
            ],
            # One group per row, in stored order: two groups may share a title.
            notes=[
                NoteGroupRead(title=s.title, bullets=_bullets(s.body))
                for s in sections
                if s.kind == SectionKind.NOTES
            ],
            provider=summary.provider,
            model=summary.model,
            generated_at=summary.generated_at,
            is_stale=summary.is_stale,
        )

    def regenerate(
        self, meeting_id: int, *, before_ai: Callable[[], None] | None = None
    ) -> SummaryRead:
        """`before_ai` runs once every guard has passed, just before the AI is called (the
        API's rate limiter), so rejected requests (404/410/422/409) are never counted."""
        claim = self._claim(meeting_id, before_ai)
        try:
            result = self.summarizer.summarize(claim.transcript)
        except BaseException:
            self._release(claim)
            raise
        try:
            meeting = require_active_meeting(self.uow, meeting_id)
            # Clearing our own claim first makes the write conditional on still owning it.
            if not self.uow.summaries.release_claim(claim.summary, claim.token):
                raise _generating()
            result = timeline.snap_summary(result, claim.starts)
            self.save_result(meeting, result, result.provider, result.model)
            self.uow.commit()
        except ConflictError:
            self.uow.rollback()
            raise
        except BaseException:
            self.uow.rollback()
            self._release(claim)
            raise
        return self.get(meeting_id)

    def save_result(
        self, meeting: Meeting, result: SummaryResult, provider: str, model: str | None
    ) -> None:
        """Write (or overwrite) the summary rows and clear any claim. Never commits."""
        repo = self.uow.summaries
        summary = repo.get_by_meeting(meeting.id)
        if summary is None:
            summary = repo.add(Summary(meeting_id=meeting.id))
        summary.overview = result.overview
        summary.provider = provider
        summary.model = model
        summary.generated_at = datetime.now(UTC)
        summary.is_stale = False
        summary.generating_since = None
        repo.replace_sections(summary.id, _sections(summary.id, result))
        repo.replace_keywords(meeting.id, _keywords(meeting.id, result))

    def _claim(self, meeting_id: int, before_ai: Callable[[], None] | None = None) -> _Claim:
        """Transaction 1: mark the summary as generating and snapshot the AI input."""
        try:
            meeting = require_active_meeting(self.uow, meeting_id)
            transcript, starts = self._transcript(meeting)
            token = datetime.now(UTC)
            repo = self.uow.summaries
            summary = repo.get_by_meeting(meeting_id)
            created = summary is None
            if summary is None:
                summary = repo.add(Summary(meeting_id=meeting_id, generating_since=token))
            elif not repo.claim(summary, token, token - GENERATING_CLAIM_TTL):
                raise _generating()
            if before_ai is not None:
                before_ai()  # may raise (rate limited): the rollback below undoes the claim
            self.uow.commit()
        except IntegrityError as exc:
            # Another request inserted the first summary row between our read and insert.
            self.uow.rollback()
            raise _generating() from exc
        except BaseException:
            self.uow.rollback()
            raise
        return _Claim(summary, token, created, transcript, starts)

    def _transcript(self, meeting: Meeting) -> tuple[TranscriptForAI, list[int]]:
        segments = self.uow.transcript.segments(meeting.id)
        if not segments:
            raise ValidationFailedError(
                "This meeting has no transcript to summarise", code="TRANSCRIPT_EMPTY"
            )
        transcript = build_transcript_for_ai(
            meeting,
            segments,
            self.uow.transcript.speakers(meeting.id),
            self.uow.participants.list_for_meeting(meeting.id),
        )
        return transcript, timeline.line_starts(s.start_ms for s in segments)

    def _release(self, claim: _Claim) -> None:
        """Clear our claim in its own transaction; never masks the caller's error.

        A row created only to hold the claim is removed. A claim that was taken over
        (ours went stale) is left alone.
        """
        try:
            self.uow.rollback()
            repo = self.uow.summaries
            if claim.created:
                repo.delete_if_claimed(claim.summary, claim.token)
            else:
                repo.release_claim(claim.summary, claim.token)
            self.uow.commit()
        except Exception:
            self.uow.rollback()
            logger.exception("Could not release the summary generation claim")


def _bullets(body: str) -> list[str]:
    return [line.strip() for line in body.splitlines() if line.strip()]


def _sections(summary_id: int, result: SummaryResult) -> list[SummarySection]:
    rows = [
        SummarySection(
            summary_id=summary_id,
            kind=SectionKind.OUTLINE,
            title=entry.title[:SECTION_TITLE_MAX],
            start_ms=entry.start_ms,
            sequence=i,
        )
        for i, entry in enumerate(result.outline)
    ]
    rows.extend(
        SummarySection(
            summary_id=summary_id,
            kind=SectionKind.NOTES,
            title=group.title[:SECTION_TITLE_MAX],
            body="\n".join(group.bullets),
            sequence=i,
        )
        for i, group in enumerate(result.notes)
    )
    return rows


def _keywords(meeting_id: int, result: SummaryResult) -> list[Keyword]:
    seen: set[str] = set()
    rows: list[Keyword] = []
    for k in result.keywords:
        term = k.term.strip()[:KEYWORD_MAX]
        if term and term.lower() not in seen:
            seen.add(term.lower())
            rows.append(Keyword(meeting_id=meeting_id, term=term, weight=k.weight))
    return rows
