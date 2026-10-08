"""Read-only queries that gather what AskFred's skills answer from.

Kept apart from the per-aggregate repositories because every query here spans
meetings, summaries and action items at once and only ever reads.
"""

from bisect import bisect_right
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import date, datetime

from sqlalchemy import ColumnElement, and_, exists, or_, select
from sqlalchemy.orm import Session

from app.models import (
    ActionItem,
    Meeting,
    Participant,
    Summary,
    SummarySection,
    TranscriptSegment,
)
from app.models.enums import ActionItemSource, ActionItemStatus, MeetingStatus


@dataclass(frozen=True)
class OpenItem:
    id: int
    text: str
    due_date: date | None
    meeting_id: int
    meeting_title: str
    meeting_started_at: datetime
    start_ms: int | None
    assignee: str | None
    assignee_user_id: int | None


@dataclass(frozen=True)
class SegmentRef:
    segment_id: int
    start_ms: int
    text: str


class ChatContextRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def open_items_this_week(
        self, week_start: date, week_end: date, raised_since: datetime
    ) -> list[OpenItem]:
        """Open items due in [week_start, week_end], raised in a meeting since `raised_since`,
        or added by hand since then. Seeded rows are all *created* at seed time, so the
        meeting date is what says when an item came up."""
        recent = or_(
            ActionItem.due_date.between(week_start, week_end),
            and_(Meeting.status == MeetingStatus.COMPLETED, Meeting.started_at >= raised_since),
            and_(
                ActionItem.source == ActionItemSource.MANUAL,
                ActionItem.created_at >= raised_since,
            ),
        )
        return self._open_items(recent)

    def open_items_for_meetings(self, meeting_ids: Sequence[int]) -> list[OpenItem]:
        if not meeting_ids:
            return []
        return self._open_items(ActionItem.meeting_id.in_(meeting_ids))

    def _open_items(self, condition: ColumnElement[bool]) -> list[OpenItem]:
        stmt = (
            select(
                ActionItem,
                Meeting.id,
                Meeting.title,
                Meeting.started_at,
                Participant.display_name,
                Participant.user_id,
            )
            .join(Meeting, Meeting.id == ActionItem.meeting_id)
            .outerjoin(Participant, Participant.id == ActionItem.assignee_participant_id)
            .where(
                ActionItem.status == ActionItemStatus.OPEN,
                Meeting.not_deleted(),
                condition,
            )
            .order_by(
                ActionItem.due_date.is_(None),
                ActionItem.due_date,
                Meeting.started_at.desc(),
                ActionItem.sequence,
                ActionItem.id,
            )
        )
        return [
            OpenItem(
                id=item.id,
                text=item.text,
                due_date=item.due_date,
                meeting_id=meeting_id,
                meeting_title=title,
                meeting_started_at=started_at,
                start_ms=item.start_ms,
                assignee=name,
                assignee_user_id=user_id,
            )
            for item, meeting_id, title, started_at, name, user_id in self.session.execute(stmt)
        ]

    def recent_completed(
        self, before: datetime, limit: int, *, with_summary: bool = False
    ) -> list[Meeting]:
        """Live completed meetings that started before `before`, newest first."""
        stmt = select(Meeting).where(
            Meeting.status == MeetingStatus.COMPLETED,
            Meeting.not_deleted(),
            Meeting.started_at <= before,
        )
        if with_summary:
            stmt = stmt.where(exists().where(Summary.meeting_id == Meeting.id))
        stmt = stmt.order_by(Meeting.started_at.desc(), Meeting.id.desc()).limit(limit)
        return list(self.session.scalars(stmt))

    def next_scheduled(self, after: datetime) -> Meeting | None:
        stmt = (
            select(Meeting)
            .where(
                Meeting.status == MeetingStatus.SCHEDULED,
                Meeting.not_deleted(),
                Meeting.started_at >= after,
            )
            .order_by(Meeting.started_at, Meeting.id)
            .limit(1)
        )
        return self.session.scalar(stmt)

    def participants(self, meeting_ids: Sequence[int]) -> dict[int, list[Participant]]:
        out: dict[int, list[Participant]] = {mid: [] for mid in meeting_ids}
        if not meeting_ids:
            return out
        stmt = (
            select(Participant)
            .where(Participant.meeting_id.in_(meeting_ids))
            .order_by(Participant.id)
        )
        for p in self.session.scalars(stmt):
            out[p.meeting_id].append(p)
        return out

    def sections(self, meeting_ids: Sequence[int]) -> dict[int, list[SummarySection]]:
        """Summary sections per meeting, outline before notes, each in display order."""
        out: dict[int, list[SummarySection]] = {mid: [] for mid in meeting_ids}
        if not meeting_ids:
            return out
        stmt = (
            select(Summary.meeting_id, SummarySection)
            .join(Summary, Summary.id == SummarySection.summary_id)
            .where(Summary.meeting_id.in_(meeting_ids))
            .order_by(SummarySection.kind, SummarySection.sequence)
        )
        for mid, section in self.session.execute(stmt):
            out[mid].append(section)
        return out

    def segments_at(
        self, positions: Iterable[tuple[int, int]]
    ) -> dict[tuple[int, int], SegmentRef]:
        """The transcript line playing at each (meeting_id, ms): the last one starting at or
        before it. Positions before the first line or in meetings with no transcript are absent."""
        wanted = set(positions)
        meeting_ids = sorted({mid for mid, _ in wanted})
        if not meeting_ids:
            return {}
        stmt = (
            select(
                TranscriptSegment.meeting_id,
                TranscriptSegment.id,
                TranscriptSegment.start_ms,
                TranscriptSegment.text,
            )
            .where(TranscriptSegment.meeting_id.in_(meeting_ids))
            .order_by(TranscriptSegment.meeting_id, TranscriptSegment.start_ms)
        )
        by_meeting: dict[int, list[SegmentRef]] = {}
        for mid, sid, start, text in self.session.execute(stmt):
            by_meeting.setdefault(mid, []).append(SegmentRef(sid, start, text))
        out: dict[tuple[int, int], SegmentRef] = {}
        for mid, ms in wanted:
            refs = by_meeting.get(mid, [])
            i = bisect_right([r.start_ms for r in refs], ms) - 1
            if i >= 0:
                out[(mid, ms)] = refs[i]
        return out
