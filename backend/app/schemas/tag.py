from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.schemas.common import InputModel

TagName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
# Index into the client's tag palette (eight swatches).
ColorIndex = Annotated[int, Field(ge=0, le=7)]


class TagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color_index: int


class TagCreate(InputModel):
    name: TagName
    color_index: ColorIndex = 0


class TagUpdate(InputModel):
    name: TagName | None = None
    color_index: ColorIndex | None = None

    @field_validator("name", "color_index", mode="before")
    @classmethod
    def _not_null(cls, value: Any) -> Any:
        if value is None:
            raise ValueError("must not be null")
        return value


class MeetingTagsUpdate(InputModel):
    """The meeting's complete tag set; tags left out are removed."""

    tag_ids: list[int] = Field(max_length=50)
