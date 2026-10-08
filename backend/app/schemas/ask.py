from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

from app.schemas.common import InputModel

Question = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class AskTurn(InputModel):
    role: Literal["user", "assistant"]
    text: Annotated[str, StringConstraints(max_length=4000)]


class AskRequest(InputModel):
    question: Question
    # Accepted so clients can send their conversation; answers do not use it yet.
    history: list[AskTurn] = Field(default_factory=list, max_length=20)


class CrossMeetingAskRequest(InputModel):
    question: Question
    # Limits the search to these meetings (e.g. the current channel); omit for all.
    meeting_ids: list[int] | None = Field(default=None, max_length=200)


class AskCitation(BaseModel):
    meeting_id: int
    meeting_title: str
    segment_id: int
    start_ms: int
    quote: str


class AskResponse(BaseModel):
    answer: str
    citations: list[AskCitation]
    provider: str
    model: str | None
