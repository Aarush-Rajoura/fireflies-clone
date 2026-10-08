"""Ask AI: questions about one meeting, or across meetings. Both spend AI calls."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.api.responses import AI_UNAVAILABLE, GONE, NOT_FOUND, RATE_LIMITED, VALIDATION
from app.core.deps import get_ask_service
from app.core.rate_limit import enforce_ai_rate_limit
from app.schemas.ask import AskRequest, AskResponse, CrossMeetingAskRequest
from app.services.ask import AskService

router = APIRouter(tags=["ask"])

Ask = Annotated[AskService, Depends(get_ask_service)]


@router.post(
    "/meetings/{meeting_id}/ask",
    response_model=AskResponse,
    summary="Ask a question about a meeting",
    description="Answers from the meeting's transcript; each citation is one of its lines. "
    "A meeting without a transcript is `422 TRANSCRIPT_EMPTY`.",
    responses={**NOT_FOUND, **GONE, **VALIDATION, **RATE_LIMITED, **AI_UNAVAILABLE},
)
def ask_meeting(meeting_id: int, body: AskRequest, request: Request, service: Ask) -> AskResponse:
    return service.ask_meeting(
        meeting_id, body.question, before_ai=lambda: enforce_ai_rate_limit(request)
    )


@router.post(
    "/search/ask",
    response_model=AskResponse,
    summary="Ask a question across meetings",
    description="Answers from the best transcript matches (and those meetings' summaries) "
    "across all live meetings, or only `meeting_ids` when given.",
    responses={**VALIDATION, **RATE_LIMITED, **AI_UNAVAILABLE},
)
def ask_across_meetings(
    body: CrossMeetingAskRequest, request: Request, service: Ask
) -> AskResponse:
    return service.ask_across(
        body.question, body.meeting_ids, before_ai=lambda: enforce_ai_rate_limit(request)
    )
