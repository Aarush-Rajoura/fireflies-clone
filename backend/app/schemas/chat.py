from datetime import datetime
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.models.enums import ChatRole
from app.schemas.common import InputModel

ChatQuestion = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)
]


class ChatSkillId(StrEnum):
    ACTION_ITEMS = "action-items"
    SUMMARIZE = "summarize"
    PREPARE = "prepare"
    DIGEST = "digest"
    # Grounded free-form question over transcripts; the default when nothing else matches.
    ASK = "ask"


class ChatMessageCreate(InputModel):
    question: ChatQuestion
    # Context from an @-mention: summaries and questions focus on this meeting.
    meeting_id: int | None = None
    # Run this skill regardless of the question's wording (e.g. a suggested prompt).
    skill: ChatSkillId | None = None


class ChatCitationRead(BaseModel):
    id: int
    meeting_id: int
    meeting_title: str
    segment_id: int | None
    start_ms: int | None
    quote: str


class ChatMessageRead(BaseModel):
    id: int
    role: ChatRole
    content: str
    skill: str | None
    provider: str | None
    model: str | None
    created_at: datetime
    citations: list[ChatCitationRead]


class ChatThreadRead(BaseModel):
    id: int
    title: str
    meeting_id: int | None
    created_at: datetime
    updated_at: datetime


class ChatThreadDetail(ChatThreadRead):
    messages: list[ChatMessageRead]


class ChatExchange(BaseModel):
    """One question and its answer, plus the thread as it stands afterwards."""

    thread: ChatThreadRead
    user_message: ChatMessageRead
    assistant_message: ChatMessageRead


class ChatSkillRead(BaseModel):
    id: ChatSkillId
    label: str
    description: str
    # A lucide icon name, so the client picks the glyph.
    icon: str
    # Typed at the start of a question to run the skill, e.g. "/digest".
    command: str
