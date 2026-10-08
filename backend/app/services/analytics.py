"""Workspace analytics: read-only aggregates over finished meetings in a time window."""

from collections import Counter
from collections.abc import Sequence
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.db.unit_of_work import UnitOfWork
from app.models.enums import MeetingSource
from app.repositories.analytics import SpeakerTalk
from app.schemas.analytics import (
    Activity,
    AnalyticsOverview,
    AnalyticsRange,
    AnalyticsTotals,
    KeywordStat,
    SourceCount,
    TalkTime,
    TalkTimeShare,
    WeekBucket,
)
from app.services.guards import check_timezone

RANGE_DAYS: dict[AnalyticsRange, int | None] = {
    AnalyticsRange.WEEK: 7,
    AnalyticsRange.MONTH: 30,
    AnalyticsRange.QUARTER: 90,
    AnalyticsRange.ALL: None,
}
TOP_SPEAKERS = 8  # one per speaker colour; everyone else folds into "Others"
TOP_KEYWORDS = 10
OTHERS = "Others"


def _week_start(day: date) -> date:
    return day - timedelta(days=day.weekday())


def weekly_buckets(
    starts: Sequence[tuple[datetime, int]], zone: ZoneInfo, *, first: date, last: date
) -> list[WeekBucket]:
    """Counts per local Monday-started week from `first`'s week to `last`'s, zero-filled."""
    counts: Counter[date] = Counter()
    for at, n in starts:
        counts[_week_start(at.astimezone(zone).date())] += n
    week, end = _week_start(first), _week_start(last)
    buckets: list[WeekBucket] = []
    while week <= end:
        buckets.append(WeekBucket(week_start=week, meetings=counts[week]))
        week += timedelta(days=7)
    return buckets


def activity(starts: Sequence[tuple[datetime, int]], zone: ZoneInfo) -> Activity:
    grid = [[0] * 24 for _ in range(7)]
    for at, n in starts:
        local = at.astimezone(zone)
        grid[local.weekday()][local.hour] += n
    by_day = [sum(row) for row in grid]
    by_hour = [sum(row[h] for row in grid) for h in range(24)]
    # Ties go to the earliest day / hour, so the answer is stable.
    busiest_day = max(range(7), key=lambda d: (by_day[d], -d)) if any(by_day) else None
    busiest_hour = max(range(24), key=lambda h: (by_hour[h], -h)) if any(by_hour) else None
    return Activity(heatmap=grid, busiest_weekday=busiest_day, busiest_hour=busiest_hour)


def talk_shares(rows: Sequence[SpeakerTalk]) -> TalkTime:
    """Top speakers by talk time, the rest summed into one trailing "Others" row."""
    total = sum(r.talk_ms for r in rows)
    top = [(r.name, r.talk_ms, False) for r in rows[:TOP_SPEAKERS]]
    rest = sum(r.talk_ms for r in rows[TOP_SPEAKERS:])
    if rest:
        top.append((OTHERS, rest, True))
    return TalkTime(
        total_ms=total,
        participants=[
            TalkTimeShare(name=name, talk_ms=ms, share=ms / total if total else 0.0, is_other=o)
            for name, ms, o in top
        ],
    )


class AnalyticsService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    def overview(
        self, range_: AnalyticsRange, tz: str = "UTC", *, now: datetime | None = None
    ) -> AnalyticsOverview:
        zone = check_timezone(tz)
        now = now or datetime.now(UTC)
        days = RANGE_DAYS[range_]
        since = now - timedelta(days=days) if days is not None else None
        repo = self.uow.analytics

        meetings = repo.meeting_totals(since)
        items = repo.action_item_totals(since)
        starts = repo.start_minute_counts(since)
        sources = repo.source_counts(since)

        local_now = now.astimezone(zone).date()
        first = (since or (starts[0][0] if starts else now)).astimezone(zone).date()
        # Seeded "today" meetings may start later today; never drop their week.
        last = max(local_now, starts[-1][0].astimezone(zone).date()) if starts else local_now

        return AnalyticsOverview(
            range=range_,
            tz=tz,
            start=since,
            end=now,
            totals=AnalyticsTotals(
                meetings=meetings.meetings,
                total_duration_ms=meetings.total_duration_ms,
                avg_duration_ms=round(meetings.total_duration_ms / max(meetings.meetings, 1)),
                unique_participants=repo.unique_participants(since),
                action_items_created=items.created,
                action_items_completed=items.completed,
                completion_rate=items.completed / items.created if items.created else 0.0,
            ),
            meetings_per_week=weekly_buckets(starts, zone, first=first, last=last),
            talk_time=talk_shares(repo.talk_time(since)),
            top_keywords=[
                KeywordStat(term=k.term, meetings=k.meetings, weight=round(k.weight, 3))
                for k in repo.top_keywords(since, TOP_KEYWORDS)
            ],
            activity=activity(starts, zone),
            sources=[SourceCount(source=s, meetings=sources.get(s, 0)) for s in MeetingSource],
        )
