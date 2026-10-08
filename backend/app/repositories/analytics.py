"""Read-only aggregates over finished, non-deleted meetings in a time window."""

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import ColumnElement, Select, String, case, cast, distinct, func, select
from sqlalchemy.orm import Session

from app.models import ActionItem, Keyword, Meeting, Participant, User
from app.models.enums import ActionItemStatus, MeetingSource, MeetingStatus

_MINUTE_FORMAT = "%Y-%m-%d %H:%M"


@dataclass(frozen=True)
class MeetingTotals:
    meetings: int
    total_duration_ms: int


@dataclass(frozen=True)
class ActionItemTotals:
    created: int
    completed: int


@dataclass(frozen=True)
class SpeakerTalk:
    name: str
    talk_ms: int


@dataclass(frozen=True)
class KeywordCount:
    term: str
    meetings: int
    weight: float


def _person_key() -> ColumnElement[str]:
    """One person across meetings: the linked user, else the name ignoring case."""
    return case(
        (Participant.user_id.is_not(None), "u:" + cast(Participant.user_id, String)),
        else_="n:" + func.lower(Participant.display_name),
    )


class AnalyticsRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    @staticmethod
    def _in_window(since: datetime | None) -> list[ColumnElement[bool]]:
        # Scheduled meetings have not happened yet, so they never count as activity.
        conds = [Meeting.not_deleted(), Meeting.status == MeetingStatus.COMPLETED]
        if since is not None:
            conds.append(Meeting.started_at >= since)
        return conds

    def _meeting_ids(self, since: datetime | None) -> Select[int]:
        return select(Meeting.id).where(*self._in_window(since))

    def meeting_totals(self, since: datetime | None) -> MeetingTotals:
        stmt = select(func.count(Meeting.id), func.coalesce(func.sum(Meeting.duration_ms), 0))
        count, duration = self.session.execute(stmt.where(*self._in_window(since))).one()
        return MeetingTotals(meetings=int(count), total_duration_ms=int(duration))

    def unique_participants(self, since: datetime | None) -> int:
        stmt = select(func.count(distinct(_person_key()))).where(
            Participant.meeting_id.in_(self._meeting_ids(since))
        )
        return int(self.session.scalar(stmt) or 0)

    def action_item_totals(self, since: datetime | None) -> ActionItemTotals:
        completed = func.coalesce(
            func.sum(case((ActionItem.status == ActionItemStatus.COMPLETED, 1), else_=0)), 0
        )
        stmt = select(func.count(ActionItem.id), completed).where(
            ActionItem.meeting_id.in_(self._meeting_ids(since))
        )
        created, done = self.session.execute(stmt).one()
        return ActionItemTotals(created=int(created), completed=int(done))

    def start_minute_counts(self, since: datetime | None) -> list[tuple[datetime, int]]:
        """Meeting counts per UTC start minute.

        Minute (not hour) granularity because zones like Asia/Kolkata are offset
        by half an hour; the caller re-buckets these into local weeks and hours.
        """
        minute = func.strftime(_MINUTE_FORMAT, Meeting.started_at)
        stmt = (
            select(minute, func.count(Meeting.id))
            .where(*self._in_window(since))
            .group_by(minute)
            .order_by(minute)
        )
        return [
            (datetime.strptime(m, _MINUTE_FORMAT).replace(tzinfo=UTC), int(n))
            for m, n in self.session.execute(stmt)
        ]

    def talk_time(self, since: datetime | None) -> list[SpeakerTalk]:
        """Talk time per person, largest first (ties by name for a stable order)."""
        total = func.sum(Participant.talk_ms)
        # A linked user is shown by their account name, whatever each meeting called them.
        name = func.min(func.coalesce(User.name, Participant.display_name))
        stmt = (
            select(name, total)
            .outerjoin(User, User.id == Participant.user_id)
            .where(Participant.meeting_id.in_(self._meeting_ids(since)))
            .group_by(_person_key())
            .having(total > 0)
            .order_by(total.desc(), name)
        )
        return [SpeakerTalk(name=n, talk_ms=int(ms)) for n, ms in self.session.execute(stmt)]

    def top_keywords(self, since: datetime | None, limit: int) -> list[KeywordCount]:
        meetings = func.count(distinct(Keyword.meeting_id))
        weight = func.sum(Keyword.weight)
        term = func.min(Keyword.term)
        stmt = (
            select(term, meetings, weight)
            .where(Keyword.meeting_id.in_(self._meeting_ids(since)))
            .group_by(func.lower(Keyword.term))
            .order_by(meetings.desc(), weight.desc(), term)
            .limit(limit)
        )
        return [
            KeywordCount(term=t, meetings=int(n), weight=float(w))
            for t, n, w in self.session.execute(stmt)
        ]

    def source_counts(self, since: datetime | None) -> dict[MeetingSource, int]:
        stmt = (
            select(Meeting.source, func.count(Meeting.id))
            .where(*self._in_window(since))
            .group_by(Meeting.source)
        )
        return {MeetingSource(s): int(n) for s, n in self.session.execute(stmt)}
