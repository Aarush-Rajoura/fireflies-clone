"""Home dashboard routes: simulated calendar connections, the AI feed and notifications."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.api.params import Paging
from app.api.responses import NOT_FOUND, SERVICE_UNAVAILABLE, VALIDATION
from app.core.deps import get_calendar_service, get_feed_service, get_notification_service
from app.schemas.common import Page
from app.schemas.home import (
    CalendarConnectionCreate,
    CalendarConnectionRead,
    CalendarProvider,
    FeedItem,
    NotificationRead,
    NotificationUpdate,
)
from app.services.calendar import CalendarService
from app.services.feed import FeedService
from app.services.notifications import NotificationService

router = APIRouter()

Calendars = Annotated[CalendarService, Depends(get_calendar_service)]
Notifications = Annotated[NotificationService, Depends(get_notification_service)]


@router.get(
    "/calendar-connections",
    response_model=Page[CalendarConnectionRead],
    tags=["calendar"],
    summary="List calendar connections",
    responses={**VALIDATION, **SERVICE_UNAVAILABLE},
)
def list_calendar_connections(page: Paging, service: Calendars) -> Page[CalendarConnectionRead]:
    return service.list(page)


@router.post(
    "/calendar-connections",
    status_code=201,
    response_model=CalendarConnectionRead,
    tags=["calendar"],
    summary="Connect a calendar (simulated; imports 3 sample meetings)",
    description="Idempotent: connecting an already connected provider returns it with 200 "
    "and imports nothing.",
    responses={
        200: {"model": CalendarConnectionRead, "description": "Already connected."},
        **VALIDATION,
        **SERVICE_UNAVAILABLE,
    },
)
def connect_calendar(
    body: CalendarConnectionCreate, response: Response, service: Calendars
) -> CalendarConnectionRead:
    result = service.connect(body)
    if not result.created:
        response.status_code = 200
    return result.connection


@router.delete(
    "/calendar-connections/{provider}",
    status_code=204,
    response_class=Response,
    tags=["calendar"],
    summary="Disconnect a calendar and remove only the meetings it imported",
    responses={**NOT_FOUND, **VALIDATION, **SERVICE_UNAVAILABLE},
)
def disconnect_calendar(provider: CalendarProvider, service: Calendars) -> None:
    service.disconnect(provider)


@router.get(
    "/feed",
    response_model=Page[FeedItem],
    tags=["feed"],
    summary="AI feed derived from summaries, action items and keywords",
    description="Read-only and derived from stored data: no AI call is made.",
    responses={**VALIDATION, **SERVICE_UNAVAILABLE},
)
def get_feed(
    page: Paging, service: Annotated[FeedService, Depends(get_feed_service)]
) -> Page[FeedItem]:
    return service.page(page)


@router.get(
    "/notifications",
    response_model=Page[NotificationRead],
    tags=["notifications"],
    summary="List notifications, unread first",
    responses={**VALIDATION, **SERVICE_UNAVAILABLE},
)
def list_notifications(page: Paging, service: Notifications) -> Page[NotificationRead]:
    return service.list(page)


@router.patch(
    "/notifications/{notification_id}",
    response_model=NotificationRead,
    tags=["notifications"],
    summary="Mark a notification read or unread",
    responses={**NOT_FOUND, **VALIDATION, **SERVICE_UNAVAILABLE},
)
def update_notification(
    notification_id: int, body: NotificationUpdate, service: Notifications
) -> NotificationRead:
    return service.update(notification_id, body)


@router.post(
    "/notifications/read-all",
    status_code=204,
    response_class=Response,
    tags=["notifications"],
    summary="Mark every notification read",
    responses={**VALIDATION, **SERVICE_UNAVAILABLE},
)
def mark_all_notifications_read(service: Notifications) -> None:
    service.mark_all_read()
