"""Shared helpers for repository tests."""

from collections.abc import Iterator, Sequence
from contextlib import contextmanager
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Engine, event

from app.models import Meeting
from app.repositories.meetings import MeetingRepository
from app.schemas.common import PageParams
from app.schemas.meeting_filters import MeetingFilters, MeetingSort

PAGE = PageParams()


def at(day: int, hour: int = 12) -> datetime:
    return datetime(2026, 7, day, hour, tzinfo=UTC)


def titles(items: Sequence[Meeting]) -> list[str]:
    return [m.title for m in items]


@contextmanager
def count_queries(engine: Engine) -> Iterator[list[str]]:
    statements: list[str] = []

    def _on(*args: Any) -> None:
        statements.append(args[2])

    event.listen(engine, "before_cursor_execute", _on)
    try:
        yield statements
    finally:
        event.remove(engine, "before_cursor_execute", _on)


def run(
    repo: MeetingRepository,
    user_id: int = 0,
    sort: MeetingSort = MeetingSort.NEWEST,
    now: datetime | None = None,
    page: PageParams = PAGE,
    **filters: Any,
) -> tuple[list[Meeting], int]:
    return repo.list(MeetingFilters(**filters), page, sort, current_user_id=user_id, now=now)
