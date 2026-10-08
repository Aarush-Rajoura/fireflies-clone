from typing import Annotated, Any, Literal

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.models.enums import MediaType, MeetingSource, MeetingStatus, ParticipantRole, Platform
from app.schemas.channel import ChannelRef
from app.schemas.common import InputModel
from app.schemas.tag import TagRead
from app.schemas.transcript import SegmentIn, SpeakerRead
from app.schemas.user import UserRef

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
PersonName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]

SummaryStatus = Literal["none", "ready", "stale", "generating"]
# What a client may say it is creating; seed/capture/calendar are set only by the server.
CreatableSource = Literal["upload", "paste", "manual"]
CreatableStatus = Literal["scheduled", "live"]
MeetingUrl = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True, min_length=1, max_length=500, pattern=r"^https?://[^\s/]+\S*$"
    ),
]
Language = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=2, max_length=16, to_lower=True)
]


class ParticipantInput(InputModel):
    """A participant in an edit; `id` set means "this existing row, possibly renamed"."""

    id: int | None = None
    display_name: PersonName


def _distinct_names(names: list[str]) -> None:
    lowered = [n.lower() for n in names]
    if len(set(lowered)) != len(lowered):
        raise ValueError("Participant names must be unique within a meeting")


class MeetingCreate(InputModel):
    title: Title
    description: str | None = None
    started_at: AwareDatetime | None = None
    participants: list[PersonName] = Field(default_factory=list)
    # None = a form meeting with no transcript; an empty list is a client mistake.
    segments: list[SegmentIn] | None = Field(default=None, min_length=1)
    source: CreatableSource = "manual"
    channel_id: int | None = None
    # Omitted = a finished meeting (upload/paste/manual). "scheduled" needs a future
    # started_at; "live" is a Capture that starts now. Neither carries a transcript.
    status: CreatableStatus | None = None
    meeting_url: MeetingUrl | None = None
    # Detected from the meeting_url host when omitted.
    platform: Platform | None = None
    language: Language = "en"
    auto_join: bool = False

    @model_validator(mode="after")
    def _status_rules(self) -> "MeetingCreate":
        if self.status is None:
            if self.meeting_url is not None or self.platform is not None or self.auto_join:
                raise ValueError("meeting_url, platform and auto_join need status")
            return self
        if self.segments is not None:
            raise ValueError(f"A {self.status} meeting cannot have a transcript yet")
        if self.status == "scheduled" and self.started_at is None:
            raise ValueError("A scheduled meeting needs started_at")
        if self.status == "live" and self.meeting_url is None:
            raise ValueError("Capturing a live meeting needs meeting_url")
        return self


class MeetingUpdate(InputModel):
    """Partial update; unset fields are untouched, so null can clear description/channel."""

    title: Title | None = None
    description: str | None = None
    started_at: AwareDatetime | None = None
    # Merge-patch semantics: when sent, this list REPLACES the participants; omit it to keep them.
    participants: list[ParticipantInput] | None = None
    channel_id: int | None = None

    @field_validator("title", "started_at", mode="before")
    @classmethod
    def _not_null(cls, value: Any) -> Any:
        # These columns are NOT NULL, so an explicit null can only be a client mistake.
        if value is None:
            raise ValueError("must not be null")
        return value

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
    started_at: AwareDatetime
    duration_ms: int
    host: UserRef
    participant_count: int
    action_item_counts: ActionItemCountsRead
    keywords: list[str]
    tags: list[TagRead]
    has_media: bool
    status: MeetingStatus
    channel_id: int | None
    channel: ChannelRef | None
    # Join link and platform for scheduled meetings; null for uploads and pastes.
    meeting_url: str | None
    platform: Platform | None
    language: str
    # Whether the (demo) notetaker should join a scheduled meeting on its own.
    auto_join: bool


class MeetingListItem(_MeetingBase):
    """Light row for lists: never carries the transcript."""

    participants: list[ParticipantRef] = Field(max_length=5)
    overview_preview: str | None


class MeetingDetail(_MeetingBase):
    description: str | None
    participants: list[ParticipantRead]
    speakers: list[SpeakerRead]
    source: MeetingSource
    media_type: MediaType
    summary_status: SummaryStatus
    suggested_tags: list[str]
