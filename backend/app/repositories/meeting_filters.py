"""Meeting list filters as composable WHERE builders (query code only)."""

from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from enum import StrEnum
from typing import Literal

from sqlalchemy import ColumnElement, and_, exists, or_, select

from app.models import Meeting, MeetingTag, Participant
from app.models.enums import MeetingSource, MeetingStatus


class MeetingSort(StrEnum):
    NEWEST = "-started_at"
    OLDEST = "started_at"
    TITLE = "title"
    LONGEST = "-duration_ms"


@dataclass(frozen=True)
class MeetingFilters:
    q: str | None = None
    participant: str | None = None
    date_from: date | None = None  # inclusive, whole day (UTC)
    date_to: date | None = None  # inclusive, whole day (UTC)
    tag_ids: tuple[int, ...] = ()
    host_id: int | None = None
    channel_id: int | None = None
    scope: Literal["all", "hosted", "shared", "uploads"] = "all"
    status: Literal["completed", "upcoming"] = "completed"


def _name_matches(term: str) -> ColumnElement[bool]:
    return exists().where(
        Participant.meeting_id == Meeting.id,
        Participant.display_name.icontains(term, autoescape=True),
    )


def _day_start(day: date) -> datetime:
    return datetime.combine(day, time.min, tzinfo=UTC)


def _scope_clause(scope: str, user_id: int) -> ColumnElement[bool] | None:
    if scope == "hosted":
        return Meeting.host_id == user_id
    if scope == "shared":
        return and_(
            Meeting.host_id != user_id,
            exists().where(Participant.meeting_id == Meeting.id, Participant.user_id == user_id),
        )
    if scope == "uploads":
        return Meeting.source.in_([MeetingSource.UPLOAD, MeetingSource.PASTE])
    return None


def build_conditions(
    filters: MeetingFilters, *, current_user_id: int, now: datetime
) -> list[ColumnElement[bool]]:
    conds: list[ColumnElement[bool]] = [Meeting.not_deleted()]
    if filters.q and filters.q.strip():
        term = filters.q.strip()
        conds.append(or_(Meeting.title.icontains(term, autoescape=True), _name_matches(term)))
    if filters.participant and filters.participant.strip():
        conds.append(_name_matches(filters.participant.strip()))
    if filters.date_from:
        conds.append(Meeting.started_at >= _day_start(filters.date_from))
    if filters.date_to:
        conds.append(Meeting.started_at < _day_start(filters.date_to + timedelta(days=1)))
    if filters.tag_ids:
        conds.append(
            exists(
                select(MeetingTag.meeting_id).where(
                    MeetingTag.meeting_id == Meeting.id, MeetingTag.tag_id.in_(filters.tag_ids)
                )
            )
        )
    if filters.host_id is not None:
        conds.append(Meeting.host_id == filters.host_id)
    if filters.channel_id is not None:
        conds.append(Meeting.channel_id == filters.channel_id)
    scope = _scope_clause(filters.scope, current_user_id)
    if scope is not None:
        conds.append(scope)
    upcoming = and_(Meeting.status == MeetingStatus.SCHEDULED, Meeting.started_at > now)
    conds.append(upcoming if filters.status == "upcoming" else ~upcoming)
    return conds
