"""Workspace analytics."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.responses import VALIDATION
from app.core.deps import get_analytics_service
from app.schemas.analytics import AnalyticsOverview, AnalyticsRange
from app.services.analytics import AnalyticsService

router = APIRouter(tags=["analytics"])


@router.get(
    "/analytics/overview",
    response_model=AnalyticsOverview,
    summary="Meeting analytics overview",
    responses=VALIDATION,
)
def analytics_overview(
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    range: Annotated[
        AnalyticsRange, Query(description="Window ending now: the last 7, 30 or 90 days, or all.")
    ] = AnalyticsRange.MONTH,
    tz: Annotated[
        str,
        Query(
            description="IANA time zone that weeks and hours are bucketed in, e.g. "
            "`Asia/Kolkata`; an unknown name is `422 INVALID_TIMEZONE`."
        ),
    ] = "UTC",
) -> AnalyticsOverview:
    return service.overview(range, tz)
