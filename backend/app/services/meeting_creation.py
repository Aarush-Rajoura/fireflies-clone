"""Creating meetings from a form or a transcript.

AI runs first with no transaction open (SQLite has a single writer, and a slow
provider must not hold the write lock); then everything is written in one short
transaction, so a failure part-way leaves no half-built meeting.
"""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from app.ai.interfaces import ActionItemExtractor, Summarizer
from app.core.config import BYTES_PER_MB, get_settings
from app.core.exceptions import ServiceUnavailableError, ValidationFailedError
from app.db.unit_of_work import UnitOfWork
from app.models import ActionItem, Meeting, Participant, Speaker, TranscriptSegment
from app.models.enums import (
    ActionItemSource,
    MediaType,
    MeetingSource,
    MeetingStatus,
    NotificationKind,
    ParticipantRole,
    Platform,
)
from app.parsers import ParserRegistry
from app.schemas.meeting import MeetingCreate, MeetingDetail
from app.schemas.transcript import SegmentIn, TranscriptPreview
from app.services import meeting_creation_mapping as mapping
from app.services import timeline
from app.services.meeting_creation_mapping import AIOutput
from app.services.meetings import MeetingService
from app.services.notifications import NotificationService
from app.services.platforms import detect_platform
from app.services.summary import SummaryService


@dataclass(frozen=True)
class _Host:
    # Plain values: ORM rows are expired by the rollback that ends the pre-check read.
    id: int
    name: str


@dataclass(frozen=True)
class _Kind:
    """Status-dependent columns, settled once before anything is written."""

    status: MeetingStatus
    source: MeetingSource
    started_at: datetime
    platform: Platform | None


class MeetingCreationService:
    def __init__(
        self,
        uow: UnitOfWork,
        parsers: ParserRegistry,
        summarizer: Summarizer,
        extractor: ActionItemExtractor,
        summaries: SummaryService,
        *,
        max_upload_mb: int | None = None,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        self.uow = uow
        self.parsers = parsers
        self.summarizer = summarizer
        self.extractor = extractor
        self.summaries = summaries
        self.max_upload_mb = (
            max_upload_mb if max_upload_mb is not None else get_settings().max_upload_mb
        )
        self.clock = clock
        self._meetings = MeetingService(uow)
        self._notifications = NotificationService(uow)

    def preview(self, content: str, filename: str | None) -> TranscriptPreview:
        size = len(content.encode("utf-8"))
        if size > self.max_upload_mb * BYTES_PER_MB:
            raise ValidationFailedError(
                f"Transcript is larger than {self.max_upload_mb} MB",
                code="UPLOAD_TOO_LARGE",
                details={"max_mb": self.max_upload_mb, "size_bytes": size},
            )
        return mapping.preview(self.parsers.parse(content, filename))

    def create(
        self, data: MeetingCreate, *, before_ai: Callable[[], None] | None = None
    ) -> MeetingDetail:
        """`before_ai` (the API's rate limiter) runs only when segments will be sent to the
        AI, after the cheap pre-checks, so form-only and rejected requests are not counted."""
        kind = _kind(data, self.clock())
        host = self._precheck(data)
        if data.segments is not None and before_ai is not None:
            before_ai()
        ai = self._run_ai(data, host)
        try:
            meeting_id = self._write(data, ai, host, kind)
            self.uow.commit()
        except BaseException:
            self.uow.rollback()
            raise
        if data.status is None:
            self._notifications.record(
                NotificationKind.MEETING_CREATED,
                f"{data.title} is ready",
                "Transcript and AI summary are ready."
                if ai is not None
                else "Your meeting was added.",
                f"/meetings/{meeting_id}",
            )
        return self._meetings.get(meeting_id)

    def _precheck(self, data: MeetingCreate) -> _Host:
        """Cheap reads that would fail step 2, done first so a bad request costs no AI call.

        Ends with a rollback, so the AI step always starts with no transaction open (even
        if the caller left a read transaction behind).
        """
        if self.uow.session.in_transaction():
            self.uow.rollback()
        try:
            user = self.uow.users.get_default()
            if user is None:
                raise ServiceUnavailableError("Database has not been seeded", code="NOT_SEEDED")
            if data.channel_id is not None and self.uow.channels.get(data.channel_id) is None:
                raise ValidationFailedError(
                    "Channel does not exist",
                    code="CHANNEL_NOT_FOUND",
                    details={"channel_id": data.channel_id},
                )
            return _Host(id=user.id, name=user.name)
        finally:
            self.uow.rollback()

    def _run_ai(self, data: MeetingCreate, host: _Host) -> AIOutput | None:
        """Step 1: touches no database state, so no transaction is open during the calls."""
        if data.segments is None:
            return None
        people = _people(data, host)
        names = mapping.resolve_speaker_names(people, _labels(data.segments))
        transcript = mapping.ai_transcript(data.title, data.segments, names, people)
        return AIOutput(
            summary=self.summarizer.summarize(transcript),
            drafts=self.extractor.extract_action_items(transcript),
        )

    def _write(self, data: MeetingCreate, ai: AIOutput | None, host: _Host, kind: _Kind) -> int:
        """Step 2: every row for the meeting; the caller commits once."""
        segments = data.segments or []
        meeting = self.uow.meetings.add(
            Meeting(
                title=data.title,
                description=data.description,
                started_at=kind.started_at,
                duration_ms=max((s.end_ms for s in segments), default=0),
                host_id=host.id,
                channel_id=data.channel_id,
                source=kind.source,
                status=kind.status,
                media_type=MediaType.NONE,
                meeting_url=data.meeting_url,
                platform=kind.platform,
                language=data.language,
                auto_join=data.auto_join,
            )
        )
        labels = _labels(segments)
        listed = _people(data, host)
        names = mapping.resolve_speaker_names(listed, labels)
        people = self._add_participants(meeting, listed, segments, names, host)
        speaker_ids = self._add_speakers(meeting, labels, names, people)
        self.uow.transcript.bulk_add_segments(
            [
                TranscriptSegment(
                    meeting_id=meeting.id,
                    speaker_id=speaker_ids[s.speaker],
                    sequence=i,
                    start_ms=s.start_ms,
                    # The CHECK needs end >= start; imported timings are not ours to reject.
                    end_ms=max(s.end_ms, s.start_ms),
                    text=s.text,
                    original_text=s.text,
                )
                for i, s in enumerate(segments)
            ]
        )
        if ai is not None:
            starts = timeline.line_starts(s.start_ms for s in segments)
            summary = timeline.snap_summary(ai.summary, starts)
            self.summaries.save_result(meeting, summary, summary.provider, summary.model)
            self._add_ai_action_items(meeting, ai, starts, people)
        return meeting.id

    def _add_participants(
        self,
        meeting: Meeting,
        listed: list[str],
        segments: list[SegmentIn],
        names: dict[str, str],
        host: _Host,
    ) -> dict[str, Participant]:
        talk = mapping.talk_ms_by_name(segments, names)
        people: dict[str, Participant] = {}
        for name in mapping.distinct([*listed, *names.values()]):
            is_host = name.lower() == host.name.lower()
            people[name.lower()] = self.uow.participants.add(
                Participant(
                    meeting_id=meeting.id,
                    display_name=name,
                    user_id=host.id if is_host else None,
                    role=ParticipantRole.HOST if is_host else ParticipantRole.ATTENDEE,
                    talk_ms=talk.get(name.lower(), 0),
                )
            )
        return people

    def _add_speakers(
        self,
        meeting: Meeting,
        labels: list[str],
        names: dict[str, str],
        people: dict[str, Participant],
    ) -> dict[str, int]:
        ids: dict[str, int] = {}
        for label in labels:
            speaker = self.uow.transcript.add_speaker(
                Speaker(
                    meeting_id=meeting.id,
                    label=label,
                    participant_id=people[names[label].lower()].id,
                    color_index=mapping.color_index(label),
                )
            )
            ids[label] = speaker.id
        return ids

    def _add_ai_action_items(
        self,
        meeting: Meeting,
        ai: AIOutput,
        starts: list[int],
        people: dict[str, Participant],
    ) -> None:
        items: list[ActionItem] = []
        for i, draft in enumerate(ai.drafts):
            who = people.get(draft.assignee.strip().lower()) if draft.assignee else None
            items.append(
                ActionItem(
                    meeting_id=meeting.id,
                    text=draft.text,
                    # An unknown name is not guessed at: the item stays unassigned.
                    assignee_participant_id=who.id if who else None,
                    start_ms=timeline.snap(draft.start_ms, starts),
                    source=ActionItemSource.AI,
                    sequence=i,
                )
            )
        self.uow.action_items.bulk_add(items)


def _kind(data: MeetingCreate, now: datetime) -> _Kind:
    """Raises 422 for a schedule in the past; a Capture always starts now."""
    platform = data.platform
    if platform is None and data.meeting_url is not None:
        platform = detect_platform(data.meeting_url)
    if data.status == "live":
        return _Kind(MeetingStatus.LIVE, MeetingSource.CAPTURE, now, platform)
    started_at = _aware(data.started_at, now)
    if data.status == "scheduled":
        if started_at <= now:
            raise ValidationFailedError(
                "A scheduled meeting must start in the future",
                code="SCHEDULED_IN_PAST",
                details={"started_at": started_at.isoformat()},
            )
        return _Kind(MeetingStatus.SCHEDULED, MeetingSource(data.source), started_at, platform)
    return _Kind(MeetingStatus.COMPLETED, MeetingSource(data.source), started_at, platform)


def _people(data: MeetingCreate, host: _Host) -> list[str]:
    """Listed participants plus the host; a listed spelling of the host's name wins."""
    return mapping.distinct([*data.participants, host.name])


def _labels(segments: list[SegmentIn]) -> list[str]:
    return list(dict.fromkeys(s.speaker for s in segments))


def _aware(value: datetime | None, now: datetime) -> datetime:
    if value is None:
        return now
    # A naive time from a client is taken as UTC rather than rejected by the column type.
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)
