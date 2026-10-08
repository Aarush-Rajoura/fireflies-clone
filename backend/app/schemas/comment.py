from typing import Annotated

from pydantic import AwareDatetime, BaseModel, StringConstraints

from app.schemas.common import InputModel
from app.schemas.user import UserRef

CommentBody = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)
]


class CommentCreate(InputModel):
    body: CommentBody
    # Null comments on the meeting as a whole; otherwise a line of its transcript.
    segment_id: int | None = None


class CommentUpdate(InputModel):
    body: CommentBody


class CommentRead(BaseModel):
    id: int
    meeting_id: int
    segment_id: int | None
    author: UserRef | None
    body: str
    created_at: AwareDatetime
    updated_at: AwareDatetime
