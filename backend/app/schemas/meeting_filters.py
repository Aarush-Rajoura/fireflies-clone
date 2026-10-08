"""Meeting list filter and sort values: plain data shared by api, services and repositories."""

from dataclasses import dataclass
from datetime import date
from enum import StrEnum
from typing import Literal


class MeetingSort(StrEnum):
    NEWEST = "-started_at"
    OLDEST = "started_at"
    TITLE = "title"
    LONGEST = "-duration_ms"


@dataclass(frozen=True)
class MeetingFilters:
    q: str | None = None
    participant: str | None = None
    date_from: date | None = None  # inclusive, whole local day in `tz`
    date_to: date | None = None  # inclusive, whole local day in `tz`
    # IANA zone the dates are calendar days in (the viewer's), e.g. "Asia/Kolkata".
    tz: str = "UTC"
    tag_ids: tuple[int, ...] = ()
    host_id: int | None = None
    channel_id: int | None = None
    scope: Literal["all", "hosted", "shared", "uploads"] = "all"
    # completed = the library: status "completed" or "live" (a capture in progress);
    # upcoming = scheduled and in the future. Processing meetings appear in neither list.
    status: Literal["completed", "upcoming"] = "completed"
