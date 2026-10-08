from typing import Any, Literal, Self

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.common import InputModel

# Named swatches, not hex: the client maps each to a theme token.
HighlightColor = Literal["yellow", "green", "blue", "pink", "purple"]


class HighlightCreate(InputModel):
    """Half-open character range `[start_offset, end_offset)` inside the segment's text."""

    segment_id: int
    start_offset: int = Field(ge=0)
    end_offset: int = Field(ge=1)
    color: HighlightColor = "yellow"

    @model_validator(mode="after")
    def _ordered(self) -> Self:
        if self.start_offset >= self.end_offset:
            raise ValueError("start_offset must be less than end_offset")
        return self


class HighlightUpdate(InputModel):
    """Partial edit; the resulting range is re-checked against the segment text."""

    start_offset: int | None = Field(default=None, ge=0)
    end_offset: int | None = Field(default=None, ge=1)
    color: HighlightColor | None = None

    @field_validator("start_offset", "end_offset", "color", mode="before")
    @classmethod
    def _not_null(cls, value: Any) -> Any:
        if value is None:
            raise ValueError("must not be null")
        return value


class HighlightRead(BaseModel):
    id: int
    meeting_id: int
    segment_id: int
    start_offset: int
    end_offset: int
    color: HighlightColor
    created_by: int | None
