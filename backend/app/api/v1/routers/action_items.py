"""Action items: collection under the meeting, items at the top level."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.api.params import Paging
from app.api.responses import GONE, NOT_FOUND, VALIDATION
from app.core.deps import get_action_item_service
from app.schemas.action_item import ActionItemCreate, ActionItemRead, ActionItemUpdate
from app.schemas.common import Page
from app.services.action_items import ActionItemService

router = APIRouter(tags=["action-items"])

Items = Annotated[ActionItemService, Depends(get_action_item_service)]


@router.get(
    "/meetings/{meeting_id}/action-items",
    response_model=Page[ActionItemRead],
    summary="List a meeting's action items",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def list_action_items(meeting_id: int, page: Paging, service: Items) -> Page[ActionItemRead]:
    return service.list(meeting_id, page)


@router.post(
    "/meetings/{meeting_id}/action-items",
    status_code=201,
    response_model=ActionItemRead,
    summary="Add an action item",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def create_action_item(meeting_id: int, body: ActionItemCreate, service: Items) -> ActionItemRead:
    return service.create(meeting_id, body)


@router.patch(
    "/action-items/{item_id}",
    response_model=ActionItemRead,
    summary="Update an action item",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def update_action_item(item_id: int, body: ActionItemUpdate, service: Items) -> ActionItemRead:
    return service.update(item_id, body)


@router.delete(
    "/action-items/{item_id}",
    status_code=204,
    response_class=Response,
    summary="Delete an action item",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def delete_action_item(item_id: int, service: Items) -> None:
    service.delete(item_id)
