"""Writes one seed meeting (and its transcript, summary, action items) through repositories."""

from datetime import UTC, datetime, timedelta

from app.db.unit_of_work import UnitOfWork
from app.models import (
    ActionItem,
    Channel,
    Keyword,
    Meeting,
    Participant,
    Speaker,
    Summary,
    SummarySection,
    TranscriptSegment,
    User,
)
from app.models.enums import (
    ActionItemSource,
    ActionItemStatus,
    MediaType,
    MeetingSource,
    MeetingStatus,
    ParticipantRole,
    Platform,
    SectionKind,
)
from app.seed import timing
from app.seed.content import Person, SeedMeeting
from app.services.meeting_creation_mapping import color_index

SEED_PROVIDER = "seed"


def start_time(anchor: datetime, m: SeedMeeting) -> datetime:
    hour, minute = (int(p) for p in m.time.split(":"))
    day = anchor.astimezone(UTC).date() + timedelta(days=m.day_offset)
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=UTC)


def write_meeting(
    uow: UnitOfWork,
    m: SeedMeeting,
    *,
    anchor: datetime,
    cast: dict[str, Person],
    users: dict[str, User],
    channels: dict[str, Channel],
    media_url: str | None,
) -> Meeting:
    upcoming = m.meeting_url is not None
    meeting = uow.meetings.add(
        Meeting(
            title=m.title,
            description=m.description,
            started_at=start_time(anchor, m),
            duration_ms=timing.duration_ms(m.lines),
            host_id=users[m.host].id,
            channel_id=channels[m.channel].id if m.channel else None,
            source=MeetingSource.SEED,
            status=MeetingStatus.SCHEDULED if upcoming else MeetingStatus.COMPLETED,
            media_url=media_url if m.has_media else None,
            media_type=MediaType.AUDIO if m.has_media and media_url else MediaType.NONE,
            meeting_url=m.meeting_url,
            platform=Platform(m.platform) if m.platform else None,
        )
    )
    talk = timing.talk_ms(m.lines)
    people = {
        key: uow.participants.add(
            Participant(
                meeting_id=meeting.id,
                user_id=users[key].id,
                display_name=cast[key].name,
                email=cast[key].email,
                role=ParticipantRole.HOST if key == m.host else ParticipantRole.ATTENDEE,
                talk_ms=talk.get(key, 0),
            )
        )
        for key in m.participants
    }
    if m.lines:
        _write_transcript(uow, meeting, m, cast, people)
        _write_summary(uow, meeting, m)
        _write_action_items(uow, meeting, m, anchor, people)
    return meeting


def _write_transcript(
    uow: UnitOfWork,
    meeting: Meeting,
    m: SeedMeeting,
    cast: dict[str, Person],
    people: dict[str, Participant],
) -> None:
    speakers: dict[str, Speaker] = {}
    for key in m.participants:
        label = cast[key].name
        speakers[key] = uow.transcript.add_speaker(
            Speaker(
                meeting_id=meeting.id,
                label=label,
                participant_id=people[key].id,
                color_index=color_index(label),
            )
        )
    uow.transcript.bulk_add_segments(
        [
            TranscriptSegment(
                meeting_id=meeting.id,
                speaker_id=speakers[line.speaker].id,
                sequence=i,
                start_ms=line.start_ms,
                end_ms=line.end_ms,
                text=line.text,
                original_text=line.text,
            )
            for i, line in enumerate(m.lines)
        ]
    )


def _write_summary(uow: UnitOfWork, meeting: Meeting, m: SeedMeeting) -> None:
    summary = uow.summaries.add(
        Summary(meeting_id=meeting.id, overview=m.overview, provider=SEED_PROVIDER, is_stale=False)
    )
    sections = [
        SummarySection(
            summary_id=summary.id,
            kind=SectionKind.OUTLINE,
            title=title,
            start_ms=m.lines[at_line].start_ms,
            sequence=i,
        )
        for i, (title, at_line) in enumerate(m.outline)
    ]
    sections += [
        SummarySection(
            summary_id=summary.id,
            kind=SectionKind.NOTES,
            title=title,
            body="\n".join(bullets),
            sequence=i,
        )
        for i, (title, bullets) in enumerate(m.notes)
    ]
    uow.summaries.replace_sections(summary.id, sections)
    uow.summaries.replace_keywords(
        meeting.id, [Keyword(meeting_id=meeting.id, term=t, weight=w) for t, w in m.keywords]
    )


def _write_action_items(
    uow: UnitOfWork,
    meeting: Meeting,
    m: SeedMeeting,
    anchor: datetime,
    people: dict[str, Participant],
) -> None:
    today = anchor.astimezone(UTC).date()
    items = [
        ActionItem(
            meeting_id=meeting.id,
            text=a.text,
            assignee_participant_id=people[a.assignee].id if a.assignee else None,
            due_date=None
            if a.due_offset_days is None
            else today + timedelta(days=a.due_offset_days),
            status=ActionItemStatus.COMPLETED if a.completed else ActionItemStatus.OPEN,
            completed_at=meeting.started_at if a.completed else None,
            source=ActionItemSource.AI,
            start_ms=m.lines[a.at_line].start_ms,
            sequence=i,
        )
        for i, a in enumerate(m.action_items)
    ]
    uow.action_items.bulk_add(items)
