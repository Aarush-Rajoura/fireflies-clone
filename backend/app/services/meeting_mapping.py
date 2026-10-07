"""Builds meeting read schemas from ORM rows without touching the transcript."""

from collections.abc import Sequence
from datetime import UTC, datetime, timedelta

from app.db.unit_of_work import UnitOfWork
from app.models import Meeting
from app.models.enums import MediaType
from app.schemas.meeting import (
    ActionItemCountsRead,
    MeetingDetail,
    MeetingListItem,
    ParticipantRead,
    ParticipantRef,
    SummaryStatus,
    TagRead,
)
from app.schemas.user import UserRef
from app.services.transcript_text import speaker_read

LIST_PARTICIPANTS = 5
LIST_KEYWORDS = 3
SUGGESTED_TAGS = 3
OVERVIEW_PREVIEW_CHARS = 160
# A regeneration claim older than this is treated as abandoned.
GENERATING_CLAIM_TTL = timedelta(minutes=2)


def _has_media(meeting: Meeting) -> bool:
    return bool(meeting.media_url) and meeting.media_type != MediaType.NONE


def _preview(overview: str | None) -> str | None:
    text = (overview or "").strip()
    if not text:
        return None
    return (
        text
        if len(text) <= OVERVIEW_PREVIEW_CHARS
        else text[:OVERVIEW_PREVIEW_CHARS].rstrip() + "…"
    )


def list_items(uow: UnitOfWork, meetings: Sequence[Meeting]) -> list[MeetingListItem]:
    ids = [m.id for m in meetings]
    counts = uow.meetings.action_item_counts(ids)
    overviews = uow.summaries.overviews(ids)
    keywords = uow.summaries.keyword_terms(ids)
    items: list[MeetingListItem] = []
    for m in meetings:
        c = counts.get(m.id)
        items.append(
            MeetingListItem(
                id=m.id,
                title=m.title,
                started_at=m.started_at,
                duration_ms=m.duration_ms,
                host=UserRef.model_validate(m.host),
                participants=[
                    ParticipantRef.model_validate(p) for p in m.participants[:LIST_PARTICIPANTS]
                ],
                participant_count=len(m.participants),
                action_item_counts=ActionItemCountsRead(
                    open=c.open if c else 0, completed=c.completed if c else 0
                ),
                keywords=keywords.get(m.id, [])[:LIST_KEYWORDS],
                tags=[TagRead.model_validate(t) for t in m.tags],
                overview_preview=_preview(overviews.get(m.id)),
                has_media=_has_media(m),
            )
        )
    return items


def _summary_status(uow: UnitOfWork, meeting_id: int) -> SummaryStatus:
    summary = uow.summaries.get_by_meeting(meeting_id)
    if summary is None:
        return "none"
    claim = summary.generating_since
    if claim is not None and datetime.now(UTC) - claim < GENERATING_CLAIM_TTL:
        return "generating"
    return "stale" if summary.is_stale else "ready"


def detail(uow: UnitOfWork, meeting: Meeting) -> MeetingDetail:
    counts = uow.meetings.action_item_counts([meeting.id]).get(meeting.id)
    terms = uow.summaries.keyword_terms([meeting.id]).get(meeting.id, [])
    tag_names = {t.name.lower() for t in meeting.tags}
    by_id = {p.id: p for p in meeting.participants}
    return MeetingDetail(
        id=meeting.id,
        title=meeting.title,
        description=meeting.description,
        started_at=meeting.started_at,
        duration_ms=meeting.duration_ms,
        host=UserRef.model_validate(meeting.host),
        participants=[ParticipantRead.model_validate(p) for p in meeting.participants],
        participant_count=len(meeting.participants),
        speakers=[speaker_read(s, by_id) for s in uow.transcript.speakers(meeting.id)],
        action_item_counts=ActionItemCountsRead(
            open=counts.open if counts else 0, completed=counts.completed if counts else 0
        ),
        keywords=terms,
        tags=[TagRead.model_validate(t) for t in meeting.tags],
        has_media=_has_media(meeting),
        channel_id=meeting.channel_id,
        source=meeting.source,
        status=meeting.status,
        media_type=meeting.media_type,
        summary_status=_summary_status(uow, meeting.id),
        suggested_tags=[t for t in terms if t.lower() not in tag_names][:SUGGESTED_TAGS],
    )
