from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from app.models.enums import MeetingSource


class AnalyticsRange(StrEnum):
    WEEK = "7d"
    MONTH = "30d"
    QUARTER = "90d"
    ALL = "all"


class AnalyticsTotals(BaseModel):
    meetings: int
    total_duration_ms: int
    avg_duration_ms: int
    unique_participants: int
    action_items_created: int
    action_items_completed: int
    completion_rate: float = Field(description="Completed / created, 0..1; 0 when none exist.")


class WeekBucket(BaseModel):
    week_start: date = Field(description="Monday of the week, as a local day in `tz`.")
    meetings: int


class TalkTimeShare(BaseModel):
    name: str
    talk_ms: int
    share: float = Field(description="Fraction of all talk time in range, 0..1.")
    is_other: bool = Field(description="True for the single row folding everyone past the top 8.")


class TalkTime(BaseModel):
    total_ms: int
    participants: list[TalkTimeShare]


class KeywordStat(BaseModel):
    term: str
    meetings: int = Field(description="Meetings in range that list this keyword.")
    weight: float = Field(description="Summed keyword weight across those meetings.")


class Activity(BaseModel):
    heatmap: list[list[int]] = Field(
        description="7 rows (Monday first) of 24 hourly meeting counts, local to `tz`."
    )
    busiest_weekday: int | None = Field(description="0 = Monday; null when there are no meetings.")
    busiest_hour: int | None = Field(description="0..23 local; null when there are no meetings.")


class SourceCount(BaseModel):
    source: MeetingSource
    meetings: int


class AnalyticsOverview(BaseModel):
    range: AnalyticsRange
    tz: str
    start: datetime | None = Field(description="Window start (UTC); null for `all`.")
    end: datetime = Field(description="When the overview was computed (UTC).")
    totals: AnalyticsTotals
    meetings_per_week: list[WeekBucket]
    talk_time: TalkTime
    top_keywords: list[KeywordStat]
    activity: Activity
    sources: list[SourceCount]
