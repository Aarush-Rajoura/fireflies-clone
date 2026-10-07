from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.models.enums import MediaType, MeetingSource, MeetingStatus, ParticipantRole
from app.schemas.transcript import SegmentIn, SpeakerRead
from app.schemas.user import UserRef

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
PersonName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]

SummaryStatus = Literal["none", "ready", "stale", "generating"]


class ParticipantInput(BaseModel):
    """A participant in an edit; `id` set means "this existing row, possibly renamed"."""

    id: int | None = None
    display_name: PersonName


def _distinct_names(names: list[str]) -> None:
    lowered = [n.lower() for n in names]
    if len(set(lowered)) != len(lowered):
        raise ValueError("Participant names must be unique within a meeting")


class MeetingCreate(BaseModel):
    title: Title
    description: str | None = None
    started_at: datetime | None = None
    participants: list[PersonName] = Field(default_factory=list)
    # None = a form meeting with no transcript; an empty list is a client mistake.
    segments: list[SegmentIn] | None = Field(default=None, min_length=1)
    source: MeetingSource = MeetingSource.MANUAL
    channel_id: int | None = None


class MeetingUpdate(BaseModel):
    """Partial update; unset fields are untouched, so null can clear description/channel."""

    title: Title | None = None
    description: str | None = None
    started_at: datetime | None = None
    participants: list[ParticipantInput] | None = None
    channel_id: int | None = None

    @field_validator("participants", mode="before")
    @classmethod
    def _accept_plain_names(cls, value: Any) -> Any:
        if isinstance(value, list):
            return [{"display_name": v} if isinstance(v, str) else v for v in value]
        return value

    @field_validator("participants")
    @classmethod
    def _unique(cls, value: list[ParticipantInput] | None) -> list[ParticipantInput] | None:
        if value is not None:
            _distinct_names([p.display_name for p in value])
        return value


class TagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color_index: int


class ParticipantRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str


class ParticipantRead(ParticipantRef):
    user_id: int | None
    email: str | None
    role: ParticipantRole
    talk_ms: int


class ActionItemCountsRead(BaseModel):
    open: int
    completed: int


class _MeetingBase(BaseModel):
    id: int
    title: str
    started_at: datetime
    duration_ms: int
    host: UserRef
    participant_count: int
    action_item_counts: ActionItemCountsRead
    keywords: list[str]
    tags: list[TagRead]
    has_media: bool


class MeetingListItem(_MeetingBase):
    """Light row for lists: never carries the transcript."""

    participants: list[ParticipantRef] = Field(max_length=5)
    overview_preview: str | None


class MeetingDetail(_MeetingBase):
    description: str | None
    participants: list[ParticipantRead]
    speakers: list[SpeakerRead]
    channel_id: int | None
    source: MeetingSource
    status: MeetingStatus
    media_type: MediaType
    summary_status: SummaryStatus
    suggested_tags: list[str]
