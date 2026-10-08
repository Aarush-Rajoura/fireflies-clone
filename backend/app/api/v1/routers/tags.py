"""Tags, and the tag set of one meeting."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.api.params import Paging
from app.api.responses import CONFLICT, GONE, NOT_FOUND, VALIDATION
from app.core.deps import get_tag_service
from app.schemas.common import Page
from app.schemas.meeting import MeetingDetail
from app.schemas.tag import MeetingTagsUpdate, TagCreate, TagRead, TagUpdate
from app.services.tags import TagService

router = APIRouter(tags=["tags"])

Tags = Annotated[TagService, Depends(get_tag_service)]


@router.get("/tags", response_model=Page[TagRead], summary="List tags", responses=VALIDATION)
def list_tags(page: Paging, service: Tags) -> Page[TagRead]:
    return service.list(page)


@router.post(
    "/tags",
    status_code=201,
    response_model=TagRead,
    summary="Create a tag (names are unique ignoring case)",
    responses={**VALIDATION, **CONFLICT},
)
def create_tag(body: TagCreate, service: Tags) -> TagRead:
    return service.create(body)


@router.patch(
    "/tags/{tag_id}",
    response_model=TagRead,
    summary="Rename or recolour a tag",
    responses={**NOT_FOUND, **VALIDATION, **CONFLICT},
)
def update_tag(tag_id: int, body: TagUpdate, service: Tags) -> TagRead:
    return service.update(tag_id, body)


@router.delete(
    "/tags/{tag_id}",
    status_code=204,
    response_class=Response,
    summary="Delete a tag (removes it from every meeting)",
    responses={**NOT_FOUND, **VALIDATION},
)
def delete_tag(tag_id: int, service: Tags) -> None:
    service.delete(tag_id)


@router.put(
    "/meetings/{meeting_id}/tags",
    response_model=MeetingDetail,
    summary="Replace a meeting's tags",
    description="`tag_ids` is the complete set; an unknown id is `422 TAG_NOT_FOUND`.",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def set_meeting_tags(meeting_id: int, body: MeetingTagsUpdate, service: Tags) -> MeetingDetail:
    return service.set_for_meeting(meeting_id, body)
