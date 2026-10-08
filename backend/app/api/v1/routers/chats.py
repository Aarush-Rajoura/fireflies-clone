"""AskFred: chat threads, their messages and the skills AskFred offers."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response

from app.api.params import Paging
from app.api.responses import (
    GONE,
    NOT_FOUND,
    RATE_LIMITED,
    SEED_OR_AI_UNAVAILABLE,
    SERVICE_UNAVAILABLE,
    VALIDATION,
)
from app.core.deps import get_chat_service
from app.core.rate_limit import enforce_ai_rate_limit
from app.schemas.chat import (
    ChatExchange,
    ChatMessageCreate,
    ChatMessageRead,
    ChatSkillRead,
    ChatThreadDetail,
    ChatThreadRead,
)
from app.schemas.common import Page
from app.services.chats import ChatService

router = APIRouter(tags=["chats"])

Chats = Annotated[ChatService, Depends(get_chat_service)]

_ASK_DESCRIPTION = (
    "The skill is `skill` when given, else a leading `/command` (e.g. `/digest`), else a "
    "skill whose phrasing matches, else a free question answered from transcripts. Skills "
    "answer from stored meeting data without AI; only free questions call the AI and count "
    "towards the rate limit. `meeting_id` (an @-mention) focuses summaries and questions on "
    "that meeting. Citations point at meetings and, where possible, transcript lines."
)


@router.get(
    "/chat-skills",
    response_model=list[ChatSkillRead],
    summary="List AskFred's skills",
    responses={**VALIDATION},
)
def list_chat_skills(service: Chats) -> list[ChatSkillRead]:
    return service.skills()


@router.get(
    "/chats",
    response_model=Page[ChatThreadRead],
    summary="List your chats (most recently active first)",
    responses={**VALIDATION, **SERVICE_UNAVAILABLE},
)
def list_chats(
    page: Paging,
    service: Chats,
    q: Annotated[
        str | None, Query(description="Case-insensitive match on the title or any message.")
    ] = None,
) -> Page[ChatThreadRead]:
    return service.list(q, page)


@router.post(
    "/chats",
    status_code=201,
    response_model=ChatExchange,
    summary="Start a chat with its first question",
    description="Creates the thread (titled after the question) and answers it. "
    + _ASK_DESCRIPTION,
    responses={**NOT_FOUND, **GONE, **VALIDATION, **RATE_LIMITED, **SEED_OR_AI_UNAVAILABLE},
)
def create_chat(body: ChatMessageCreate, request: Request, service: Chats) -> ChatExchange:
    return service.start(body, before_ai=lambda: enforce_ai_rate_limit(request))


@router.get(
    "/chats/{chat_id}",
    response_model=ChatThreadDetail,
    summary="Get a chat with every message and citation",
    responses={**NOT_FOUND, **VALIDATION, **SERVICE_UNAVAILABLE},
)
def get_chat(chat_id: int, service: Chats) -> ChatThreadDetail:
    return service.get(chat_id)


@router.delete(
    "/chats/{chat_id}",
    status_code=204,
    response_class=Response,
    summary="Delete a chat and its messages",
    responses={**NOT_FOUND, **VALIDATION, **SERVICE_UNAVAILABLE},
)
def delete_chat(chat_id: int, service: Chats) -> None:
    service.delete(chat_id)


@router.get(
    "/chats/{chat_id}/messages",
    response_model=Page[ChatMessageRead],
    summary="List a chat's messages (oldest first)",
    responses={**NOT_FOUND, **VALIDATION, **SERVICE_UNAVAILABLE},
)
def list_chat_messages(chat_id: int, page: Paging, service: Chats) -> Page[ChatMessageRead]:
    return service.messages(chat_id, page)


@router.post(
    "/chats/{chat_id}/messages",
    status_code=201,
    response_model=ChatExchange,
    summary="Ask a follow-up question in a chat",
    description=_ASK_DESCRIPTION,
    responses={**NOT_FOUND, **GONE, **VALIDATION, **RATE_LIMITED, **SEED_OR_AI_UNAVAILABLE},
)
def post_chat_message(
    chat_id: int, body: ChatMessageCreate, request: Request, service: Chats
) -> ChatExchange:
    return service.reply(chat_id, body, before_ai=lambda: enforce_ai_rate_limit(request))
