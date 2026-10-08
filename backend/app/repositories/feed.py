"""Read-only queries behind the AI feed. Every query skips deleted and unfinished meetings."""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import ColumnElement, and_, func, select
from sqlalchemy.orm import Session

from app.models import ActionItem, Keyword, Meeting, Participant, Summary
from app.models.enums import ActionItemStatus, MeetingStatus


@dataclass(frozen=True)
class SummaryRow:
    meeting_id: int
    meeting_title: str
    overview: str
    generated_at: datetime


@dataclass(frozen=True)
class ActionItemRow:
    meeting_id: int
    meeting_title: str
    text: str
    created_at: datetime


@dataclass(frozen=True)
class KeywordTrend:
    term: str
    meetings: int
    last_seen: datetime


def _finished() -> ColumnElement[bool]:
    return and_(Meeting.not_deleted(), Meeting.status == MeetingStatus.COMPLETED)


class FeedRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def latest_summaries(self, limit: int) -> list[SummaryRow]:
        stmt = (
            select(Summary.meeting_id, Meeting.title, Summary.overview, Summary.generated_at)
            .join(Meeting, Meeting.id == Summary.meeting_id)
            .where(_finished(), Summary.overview != "")
            .order_by(Summary.generated_at.desc(), Meeting.started_at.desc(), Meeting.id.desc())
            .limit(limit)
        )
        return [SummaryRow(*row) for row in self.session.execute(stmt)]

    def open_items_assigned_to(self, user_id: int, limit: int) -> list[ActionItemRow]:
        stmt = (
            select(ActionItem.meeting_id, Meeting.title, ActionItem.text, ActionItem.created_at)
            .join(Meeting, Meeting.id == ActionItem.meeting_id)
            .join(Participant, Participant.id == ActionItem.assignee_participant_id)
            .where(
                _finished(),
                Participant.user_id == user_id,
                ActionItem.status == ActionItemStatus.OPEN,
            )
            .order_by(ActionItem.created_at.desc(), ActionItem.id.desc())
            .limit(limit)
        )
        return [ActionItemRow(*row) for row in self.session.execute(stmt)]

    def trending_keywords(self, since: datetime, until: datetime, limit: int) -> list[KeywordTrend]:
        """Keywords by how many distinct meetings in [since, until] mention them."""
        key = func.lower(Keyword.term)
        meetings = func.count(func.distinct(Keyword.meeting_id))
        stmt = (
            select(func.min(Keyword.term), meetings, func.max(Meeting.started_at))
            .join(Meeting, Meeting.id == Keyword.meeting_id)
            .where(_finished(), Meeting.started_at >= since, Meeting.started_at <= until)
            .group_by(key)
            .order_by(meetings.desc(), key)
            .limit(limit)
        )
        return [
            KeywordTrend(term=term, meetings=int(n), last_seen=last)
            for term, n, last in self.session.execute(stmt)
        ]
