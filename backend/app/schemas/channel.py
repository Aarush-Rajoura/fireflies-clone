from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

from app.schemas.common import InputModel

ChannelName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class ChannelCreate(InputModel):
    name: ChannelName


class ChannelUpdate(InputModel):
    name: ChannelName


class ChannelRead(BaseModel):
    id: int
    name: str
    slug: str
    is_private: bool
    meeting_count: int


class ChannelRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
