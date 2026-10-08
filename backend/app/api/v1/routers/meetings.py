"""Meeting collection and item routes. HTTP translation only; rules live in services."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.api.params import MeetingFilterParams, Paging, SortParam
from app.api.responses import CONFLICT, GONE, NOT_FOUND, SERVICE_UNAVAILABLE, VALIDATION
from app.core.deps import get_meeting_creation_service, get_meeting_service
from app.schemas.common import Page
from app.schemas.meeting import MeetingCreate, MeetingDetail, MeetingListItem, MeetingUpdate
from app.schemas.meeting_filters import MeetingSort
from app.services.meeting_creation import MeetingCreationService
from app.services.meetings import MeetingService

router = APIRouter(prefix="/meetings", tags=["meetings"])

Meetings = Annotated[MeetingService, Depends(get_meeting_service)]


@router.get(
    "",
    response_model=Page[MeetingListItem],
    summary="List meetings",
    responses={**VALIDATION, **SERVICE_UNAVAILABLE},
)
def list_meetings(
    filters: MeetingFilterParams,
    page: Paging,
    service: Meetings,
    sort: SortParam = MeetingSort.NEWEST,
) -> Page[MeetingListItem]:
    return service.list(filters, page, sort)


@router.post(
    "",
    status_code=201,
    response_model=MeetingDetail,
    summary="Create a meeting",
    responses={**VALIDATION, **SERVICE_UNAVAILABLE},
)
def create_meeting(
    body: MeetingCreate,
    service: Annotated[MeetingCreationService, Depends(get_meeting_creation_service)],
) -> MeetingDetail:
    return service.create(body)


@router.get(
    "/{meeting_id}",
    response_model=MeetingDetail,
    summary="Get a meeting",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def get_meeting(meeting_id: int, service: Meetings) -> MeetingDetail:
    return service.get(meeting_id)


@router.patch(
    "/{meeting_id}",
    response_model=MeetingDetail,
    summary="Update a meeting",
    responses={**NOT_FOUND, **GONE, **VALIDATION, **CONFLICT},
)
def update_meeting(meeting_id: int, body: MeetingUpdate, service: Meetings) -> MeetingDetail:
    return service.update(meeting_id, body)


@router.delete(
    "/{meeting_id}",
    status_code=204,
    response_class=Response,
    summary="Soft-delete a meeting",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def delete_meeting(meeting_id: int, service: Meetings) -> None:
    service.delete(meeting_id)


@router.post(
    "/{meeting_id}/restore",
    response_model=MeetingDetail,
    summary="Restore a soft-deleted meeting",
    responses={**NOT_FOUND, **VALIDATION},
)
def restore_meeting(meeting_id: int, service: Meetings) -> MeetingDetail:
    return service.restore(meeting_id)
