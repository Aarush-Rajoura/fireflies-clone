"""Meeting queries. Returns None for misses; business rules live in services."""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import ColumnElement, case, func, select
from sqlalchemy.orm import selectinload

from app.models import ActionItem, Meeting
from app.models.enums import ActionItemStatus
from app.repositories.base import Repository
from app.repositories.meeting_filters import build_conditions
from app.schemas.common import PageParams
from app.schemas.meeting_filters import MeetingFilters, MeetingSort

__all__ = ["ActionItemCounts", "MeetingRepository"]


@dataclass(frozen=True)
class ActionItemCounts:
    open: int
    completed: int


class MeetingRepository(Repository[Meeting]):
    model = Meeting

    def get(self, id: int, include_deleted: bool = False) -> Meeting | None:
        meeting = self.session.get(Meeting, id)
        if meeting is None or (meeting.deleted_at is not None and not include_deleted):
            return None
        return meeting

    def get_detail(self, meeting_id: int, include_deleted: bool = False) -> Meeting | None:
        """Like get, with host/participants/tags loaded (they are lazy="raise").

        The collections are viewonly: after attaching/detaching participants or tags,
        refresh or expire them (session.refresh(meeting, [...])) before reading.
        """
        stmt = select(Meeting).where(Meeting.id == meeting_id).options(*_LOAD_OPTIONS)
        meeting = self.session.scalars(stmt).one_or_none()
        if meeting is None or (meeting.deleted_at is not None and not include_deleted):
            return None
        return meeting

    def list(
        self,
        filters: MeetingFilters,
        page: PageParams,
        sort: MeetingSort = MeetingSort.NEWEST,
        *,
        current_user_id: int,
        now: datetime | None = None,
    ) -> tuple[list[Meeting], int]:
        conds = build_conditions(
            filters, current_user_id=current_user_id, now=now or datetime.now(UTC)
        )
        total = self.session.scalar(select(func.count()).select_from(Meeting).where(*conds)) or 0
        stmt = (
            select(Meeting)
            .where(*conds)
            .options(*_LOAD_OPTIONS)
            .order_by(*_order(sort))
            .limit(page.page_size)
            .offset(page.offset)
        )
        return list(self.session.scalars(stmt)), total

    def action_item_counts(self, meeting_ids: Sequence[int]) -> dict[int, ActionItemCounts]:
        if not meeting_ids:
            return {}
        is_open = case((ActionItem.status == ActionItemStatus.OPEN, 1), else_=0)
        stmt = (
            select(ActionItem.meeting_id, func.sum(is_open), func.count())
            .where(ActionItem.meeting_id.in_(meeting_ids))
            .group_by(ActionItem.meeting_id)
        )
        return {
            mid: ActionItemCounts(open=int(opened or 0), completed=int(total) - int(opened or 0))
            for mid, opened, total in self.session.execute(stmt)
        }

    def soft_delete(self, meeting: Meeting) -> None:
        meeting.deleted_at = datetime.now(UTC)
        self.session.flush()

    def restore(self, meeting: Meeting) -> None:
        meeting.deleted_at = None
        self.session.flush()


_LOAD_OPTIONS = (
    selectinload(Meeting.host),
    selectinload(Meeting.channel),
    selectinload(Meeting.participants),
    selectinload(Meeting.tags),
)


def _order(sort: MeetingSort) -> list[ColumnElement[Any]]:
    # id is the tie-breaker so pagination is stable across equal sort keys.
    primary = {
        MeetingSort.NEWEST: Meeting.started_at.desc(),
        MeetingSort.OLDEST: Meeting.started_at.asc(),
        MeetingSort.TITLE: func.lower(Meeting.title).asc(),
        MeetingSort.LONGEST: Meeting.duration_ms.desc(),
    }[sort]
    return [primary, Meeting.id.desc()]
