from typing import Any, Literal, Self

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.common import InputModel

# Named swatches, not hex: the client maps each to a theme token.
HighlightColor = Literal["yellow", "green", "blue", "pink", "purple"]

# The browser measures a selection in UTF-16 code units, so the API does too: an emoji
# counts as 2, exactly as in JavaScript's `String.prototype.length`.
_UNIT = "UTF-16 code units, matching JavaScript string indices"
START_DOC = f"Inclusive start offset into the segment text, in {_UNIT}."
END_DOC = f"Exclusive end offset into the segment text, in {_UNIT}; at most its length."


class HighlightCreate(InputModel):
    """Half-open range `[start_offset, end_offset)` inside the segment's text, in UTF-16
    code units (JavaScript string indices)."""

    segment_id: int
    start_offset: int = Field(ge=0, description=START_DOC)
    end_offset: int = Field(ge=1, description=END_DOC)
    color: HighlightColor = "yellow"

    @model_validator(mode="after")
    def _ordered(self) -> Self:
        if self.start_offset >= self.end_offset:
            raise ValueError("start_offset must be less than end_offset")
        return self


class HighlightUpdate(InputModel):
    """Partial edit; the resulting range is re-checked against the segment text."""

    start_offset: int | None = Field(default=None, ge=0, description=START_DOC)
    end_offset: int | None = Field(default=None, ge=1, description=END_DOC)
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
    start_offset: int = Field(description=START_DOC)
    end_offset: int = Field(description=END_DOC)
    color: HighlightColor
    created_by: int | None
