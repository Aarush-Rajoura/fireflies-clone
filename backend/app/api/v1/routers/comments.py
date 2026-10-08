"""Comments: collection under the meeting, items at the top level."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.api.params import Paging
from app.api.responses import GONE, NOT_FOUND, SERVICE_UNAVAILABLE, VALIDATION
from app.core.deps import get_comment_service
from app.schemas.comment import CommentCreate, CommentRead, CommentUpdate
from app.schemas.common import Page
from app.services.comments import CommentService

router = APIRouter(tags=["comments"])

Comments = Annotated[CommentService, Depends(get_comment_service)]


@router.get(
    "/meetings/{meeting_id}/comments",
    response_model=Page[CommentRead],
    summary="List a meeting's comments (oldest first)",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def list_comments(meeting_id: int, page: Paging, service: Comments) -> Page[CommentRead]:
    return service.list(meeting_id, page)


@router.post(
    "/meetings/{meeting_id}/comments",
    status_code=201,
    response_model=CommentRead,
    summary="Comment on a meeting or one of its transcript lines",
    description="A `segment_id` from another meeting is `422 SEGMENT_NOT_IN_MEETING`.",
    responses={**NOT_FOUND, **GONE, **VALIDATION, **SERVICE_UNAVAILABLE},
)
def create_comment(meeting_id: int, body: CommentCreate, service: Comments) -> CommentRead:
    return service.create(meeting_id, body)


@router.patch(
    "/comments/{comment_id}",
    response_model=CommentRead,
    summary="Edit a comment",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def update_comment(comment_id: int, body: CommentUpdate, service: Comments) -> CommentRead:
    return service.update(comment_id, body)


@router.delete(
    "/comments/{comment_id}",
    status_code=204,
    response_class=Response,
    summary="Delete a comment",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def delete_comment(comment_id: int, service: Comments) -> None:
    service.delete(comment_id)
