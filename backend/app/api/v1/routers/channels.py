"""Channels group meetings."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.api.params import Paging
from app.api.responses import CONFLICT, NOT_FOUND, VALIDATION
from app.core.deps import get_channel_service
from app.schemas.channel import ChannelCreate, ChannelRead, ChannelUpdate
from app.schemas.common import Page
from app.services.channels import ChannelService

router = APIRouter(prefix="/channels", tags=["channels"])

Channels = Annotated[ChannelService, Depends(get_channel_service)]


@router.get("", response_model=Page[ChannelRead], summary="List channels", responses=VALIDATION)
def list_channels(page: Paging, service: Channels) -> Page[ChannelRead]:
    return service.list(page)


@router.post(
    "",
    status_code=201,
    response_model=ChannelRead,
    summary="Create a channel",
    responses={**VALIDATION, **CONFLICT},
)
def create_channel(body: ChannelCreate, service: Channels) -> ChannelRead:
    return service.create(body)


@router.patch(
    "/{channel_id}",
    response_model=ChannelRead,
    summary="Rename a channel",
    responses={**NOT_FOUND, **VALIDATION, **CONFLICT},
)
def rename_channel(channel_id: int, body: ChannelUpdate, service: Channels) -> ChannelRead:
    return service.rename(channel_id, body)


@router.delete(
    "/{channel_id}",
    status_code=204,
    response_class=Response,
    summary="Delete a channel (its meetings stay, unassigned)",
    responses={**NOT_FOUND, **VALIDATION},
)
def delete_channel(channel_id: int, service: Channels) -> None:
    service.delete(channel_id)
