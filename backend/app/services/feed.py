"""The Home "AI Feed": items derived on read from summaries, action items and keywords.

The AI already ran when those rows were written, so reading the feed never calls it.
"""

import re
from datetime import UTC, datetime, timedelta

from app.db.unit_of_work import UnitOfWork
from app.schemas.common import Page, PageParams
from app.schemas.home import FeedItem
from app.services.guards import require_current_user

SUMMARY_LIMIT = 10
ACTION_ITEM_LIMIT = 10
TRENDING_LIMIT = 5
TRENDING_WINDOW = timedelta(days=7)
# A keyword "trends" only when more than one meeting raised it.
TRENDING_MIN_MEETINGS = 2

_SENTENCE_END = re.compile(r"(?<=[.!?])\s+")


def first_sentence(text: str) -> str:
    return _SENTENCE_END.split(text.strip(), maxsplit=1)[0]


class FeedService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    def page(self, page: PageParams, *, now: datetime | None = None) -> Page[FeedItem]:
        user = require_current_user(self.uow)
        items = [
            *self._summaries(),
            *self._action_items(user.id),
            *self._trending(now or datetime.now(UTC)),
        ]
        items.sort(key=lambda i: i.created_at, reverse=True)
        return Page(
            items=items[page.offset : page.offset + page.page_size],
            page=page.page,
            page_size=page.page_size,
            total=len(items),
        )

    def _summaries(self) -> list[FeedItem]:
        return [
            FeedItem(
                kind="summary",
                title=row.meeting_title,
                body=first_sentence(row.overview),
                meeting_id=row.meeting_id,
                created_at=row.generated_at,
            )
            for row in self.uow.feed.latest_summaries(SUMMARY_LIMIT)
        ]

    def _action_items(self, user_id: int) -> list[FeedItem]:
        return [
            FeedItem(
                kind="action_item",
                title=f"Action item from {row.meeting_title}",
                body=row.text,
                meeting_id=row.meeting_id,
                created_at=row.created_at,
            )
            for row in self.uow.feed.open_items_assigned_to(user_id, ACTION_ITEM_LIMIT)
        ]

    def _trending(self, now: datetime) -> list[FeedItem]:
        trends = [
            t
            for t in self.uow.feed.trending_keywords(now - TRENDING_WINDOW, now, TRENDING_LIMIT)
            if t.meetings >= TRENDING_MIN_MEETINGS
        ]
        if not trends:
            return []
        return [
            FeedItem(
                kind="trending",
                title="Trending in your meetings this week",
                body=", ".join(f"{t.term} ({t.meetings} meetings)" for t in trends),
                meeting_id=None,
                created_at=max(t.last_seen for t in trends),
            )
        ]
