"""Summary reads and regeneration. The AI call always runs with no transaction open."""

from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError

from app.ai.interfaces import Summarizer
from app.ai.types import SummaryResult, TranscriptForAI
from app.core.exceptions import ConflictError, ValidationFailedError
from app.db.unit_of_work import UnitOfWork
from app.models import Keyword, Meeting, Summary, SummarySection
from app.models.enums import SectionKind
from app.schemas.summary import NoteGroupRead, OutlineEntryRead, SummaryRead
from app.services.meeting_mapping import GENERATING_CLAIM_TTL
from app.services.meetings import MeetingService
from app.services.transcript_text import build_transcript_for_ai

SECTION_TITLE_MAX = 300
KEYWORD_MAX = 100

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


class SummaryService:
    def __init__(self, uow: UnitOfWork, summarizer: Summarizer) -> None:
        self.uow = uow
        self.summarizer = summarizer
        self._meetings = MeetingService(uow)

    def get(self, meeting_id: int) -> SummaryRead:
        self._meetings.get_active_or_raise(meeting_id)
        summary = self.uow.summaries.get_by_meeting(meeting_id)
        if summary is None:
            return _EMPTY.model_copy()
        sections = self.uow.summaries.sections(summary.id)
        notes: dict[str, list[str]] = {}
        for s in sections:
            if s.kind == SectionKind.NOTES:
                lines = [line.strip() for line in s.body.splitlines()]
                notes.setdefault(s.title, []).extend(line for line in lines if line)
        return SummaryRead(
            overview=summary.overview,
            keywords=self.uow.summaries.keyword_terms([meeting_id]).get(meeting_id, []),
            outline=[
                OutlineEntryRead(title=s.title, start_ms=s.start_ms)
                for s in sections
                if s.kind == SectionKind.OUTLINE
            ],
            notes=[NoteGroupRead(title=t, bullets=b) for t, b in notes.items()],
            provider=summary.provider,
            model=summary.model,
            generated_at=summary.generated_at,
            is_stale=summary.is_stale,
        )

    def regenerate(self, meeting_id: int) -> SummaryRead:
        summary, created, transcript = self._claim(meeting_id)
        try:
            result = self.summarizer.summarize(transcript)
        except BaseException:
            self._release(summary, created)
            raise
        try:
            meeting = self._meetings.get_active_or_raise(meeting_id)
            self.save_result(meeting, result, result.provider, result.model)
            self.uow.commit()
        except BaseException:
            self.uow.rollback()
            self._release(summary, created)
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

    def _claim(self, meeting_id: int) -> tuple[Summary, bool, TranscriptForAI]:
        """Transaction 1: mark the summary as generating and snapshot the AI input."""
        try:
            meeting = self._meetings.get_active_or_raise(meeting_id)
            transcript = self._transcript(meeting)
            now = datetime.now(UTC)
            repo = self.uow.summaries
            summary = repo.get_by_meeting(meeting_id)
            created = summary is None
            if summary is None:
                summary = repo.add(Summary(meeting_id=meeting_id, generating_since=now))
            elif not repo.claim(summary, now, now - GENERATING_CLAIM_TTL):
                raise _generating()
            self.uow.commit()
        except IntegrityError as exc:
            # Another request inserted the first summary row between our read and insert.
            self.uow.rollback()
            raise _generating() from exc
        except BaseException:
            self.uow.rollback()
            raise
        return summary, created, transcript

    def _transcript(self, meeting: Meeting) -> TranscriptForAI:
        segments = self.uow.transcript.segments(meeting.id)
        if not segments:
            raise ValidationFailedError(
                "This meeting has no transcript to summarise", code="TRANSCRIPT_EMPTY"
            )
        return build_transcript_for_ai(
            meeting,
            segments,
            self.uow.transcript.speakers(meeting.id),
            self.uow.participants.list_for_meeting(meeting.id),
        )

    def _release(self, summary: Summary, created: bool) -> None:
        """Clear the claim in its own transaction; a row made only to hold it goes too."""
        self.uow.rollback()
        if created:
            self.uow.summaries.delete(summary)
        else:
            self.uow.summaries.release_claim(summary)
        self.uow.commit()


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
