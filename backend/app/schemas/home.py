"""Home dashboard: calendar connections, the AI feed and notifications."""

from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict

# Re-exported so routers can type the path parameter without importing models.
from app.models.enums import CalendarProvider as CalendarProvider
from app.models.enums import NotificationKind
from app.schemas.common import InputModel


class CalendarConnectionCreate(InputModel):
    provider: CalendarProvider


class CalendarConnectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    provider: CalendarProvider
    connected_at: AwareDatetime


FeedKind = Literal["summary", "action_item", "trending"]


class FeedItem(BaseModel):
    """Derived from stored data on read; no AI call and no row of its own."""

    kind: FeedKind
    title: str
    body: str
    # Null for items about several meetings (trending keywords).
    meeting_id: int | None
    created_at: AwareDatetime


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: NotificationKind
    title: str
    body: str
    link: str | None
    read_at: AwareDatetime | None
    created_at: AwareDatetime


class NotificationUpdate(InputModel):
    read: bool
