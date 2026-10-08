from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from app.schemas.common import InputModel

Question = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class AskRequest(InputModel):
    question: Question


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
    # Null when there was nothing to answer from, so no AI was called.
    provider: str | None
    model: str | None
