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
    date_from: date | None = None  # inclusive, whole day (UTC)
    date_to: date | None = None  # inclusive, whole day (UTC)
    tag_ids: tuple[int, ...] = ()
    host_id: int | None = None
    channel_id: int | None = None
    scope: Literal["all", "hosted", "shared", "uploads"] = "all"
    # completed = status "completed" (the library); upcoming = scheduled and in the future.
    # Live/processing meetings appear in neither list.
    status: Literal["completed", "upcoming"] = "completed"
