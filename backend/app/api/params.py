"""Query-string parameters shared by several routes."""

from datetime import date
from typing import Annotated, Literal

from fastapi import Depends, Query

from app.schemas.common import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PageParams
from app.schemas.meeting_filters import MeetingFilters, MeetingSort


def paging(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[
        int, Query(ge=1, description=f"Clamped to {MAX_PAGE_SIZE}.")
    ] = DEFAULT_PAGE_SIZE,
) -> PageParams:
    # A function (not a Query model) because FastAPI forbids mixing a model with other params.
    return PageParams(page=page, page_size=page_size)


Paging = Annotated[PageParams, Depends(paging)]


def meeting_filters(
    q: Annotated[
        str | None,
        Query(
            description=(
                "Case-insensitive substring of the title, a participant name or the summary"
                " overview; or every word in the transcript (last word as a prefix)."
            )
        ),
    ] = None,
    participant: Annotated[str | None, Query(description="Participant name contains.")] = None,
    date_from: Annotated[date | None, Query(description="Inclusive, local day in `tz`.")] = None,
    date_to: Annotated[date | None, Query(description="Inclusive, local day in `tz`.")] = None,
    tz: Annotated[
        str,
        Query(
            description="IANA time zone the date filters are days in, e.g. `Asia/Kolkata`; "
            "an unknown name is `422 INVALID_TIMEZONE`."
        ),
    ] = "UTC",
    tag: Annotated[list[int] | None, Query(description="Tag id; repeat for any-of.")] = None,
    channel: Annotated[int | None, Query(description="Channel id.")] = None,
    scope: Literal["all", "hosted", "shared", "uploads"] = "all",
    status: Literal["completed", "upcoming"] = "completed",
) -> MeetingFilters:
    return MeetingFilters(
        q=q,
        participant=participant,
        date_from=date_from,
        date_to=date_to,
        tz=tz,
        tag_ids=tuple(tag or ()),
        channel_id=channel,
        scope=scope,
        status=status,
    )


MeetingFilterParams = Annotated[MeetingFilters, Depends(meeting_filters)]
SortParam = Annotated[MeetingSort, Query(description="Prefix `-` means descending.")]
