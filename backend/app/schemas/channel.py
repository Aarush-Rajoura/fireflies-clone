from typing import Annotated

from pydantic import BaseModel, StringConstraints

ChannelName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class ChannelCreate(BaseModel):
    name: ChannelName


class ChannelUpdate(BaseModel):
    name: ChannelName


class ChannelRead(BaseModel):
    id: int
    name: str
    slug: str
    is_private: bool
    meeting_count: int
