from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from app.schemas.common import InputModel

SoundbiteTitle = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)
]


class SoundbiteCreate(InputModel):
    """A clip of the recording; the length must be 3-180 s and end within the meeting."""

    # Omitted: the first words spoken inside the clip.
    title: SoundbiteTitle | None = None
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)


class SoundbiteRead(BaseModel):
    id: int
    meeting_id: int
    title: str
    start_ms: int
    end_ms: int
    duration_ms: int
    created_by: int | None
