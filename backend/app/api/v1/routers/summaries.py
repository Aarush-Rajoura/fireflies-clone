"""Summary routes. Regeneration calls the AI provider, so it is rate limited."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.responses import AI_UNAVAILABLE, CONFLICT, GONE, NOT_FOUND, RATE_LIMITED, VALIDATION
from app.core.deps import get_summary_service
from app.core.rate_limit import enforce_ai_rate_limit
from app.schemas.summary import SummaryRead
from app.services.summary import SummaryService

router = APIRouter(prefix="/meetings/{meeting_id}/summary", tags=["summaries"])

Summaries = Annotated[SummaryService, Depends(get_summary_service)]


@router.get(
    "",
    response_model=SummaryRead,
    summary="Get a meeting's summary",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def get_summary(meeting_id: int, service: Summaries) -> SummaryRead:
    return service.get(meeting_id)


@router.post(
    "/regenerate",
    response_model=SummaryRead,
    summary="Regenerate the summary with AI",
    responses={**NOT_FOUND, **GONE, **VALIDATION, **CONFLICT, **RATE_LIMITED, **AI_UNAVAILABLE},
    dependencies=[Depends(enforce_ai_rate_limit)],
)
def regenerate_summary(meeting_id: int, service: Summaries) -> SummaryRead:
    return service.regenerate(meeting_id)
