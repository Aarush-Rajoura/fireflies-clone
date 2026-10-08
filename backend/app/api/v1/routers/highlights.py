"""Highlights: collection under the meeting, items at the top level."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.api.params import Paging
from app.api.responses import GONE, NOT_FOUND, SERVICE_UNAVAILABLE, VALIDATION
from app.core.deps import get_highlight_service
from app.schemas.common import Page
from app.schemas.highlight import HighlightCreate, HighlightRead, HighlightUpdate
from app.services.highlights import HighlightService

router = APIRouter(tags=["highlights"])

Highlights = Annotated[HighlightService, Depends(get_highlight_service)]


@router.get(
    "/meetings/{meeting_id}/highlights",
    response_model=Page[HighlightRead],
    summary="List a meeting's highlights (transcript order)",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def list_highlights(meeting_id: int, page: Paging, service: Highlights) -> Page[HighlightRead]:
    return service.list(meeting_id, page)


@router.post(
    "/meetings/{meeting_id}/highlights",
    status_code=201,
    response_model=HighlightRead,
    summary="Highlight part of a transcript line",
    description="Offsets must satisfy `0 <= start_offset < end_offset <= len(segment.text)` "
    "(`422 HIGHLIGHT_OUT_OF_RANGE`); the segment must belong to the meeting "
    "(`422 SEGMENT_NOT_IN_MEETING`).",
    responses={**NOT_FOUND, **GONE, **VALIDATION, **SERVICE_UNAVAILABLE},
)
def create_highlight(meeting_id: int, body: HighlightCreate, service: Highlights) -> HighlightRead:
    return service.create(meeting_id, body)


@router.patch(
    "/highlights/{highlight_id}",
    response_model=HighlightRead,
    summary="Change a highlight's range or colour",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def update_highlight(
    highlight_id: int, body: HighlightUpdate, service: Highlights
) -> HighlightRead:
    return service.update(highlight_id, body)


@router.delete(
    "/highlights/{highlight_id}",
    status_code=204,
    response_class=Response,
    summary="Delete a highlight",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def delete_highlight(highlight_id: int, service: Highlights) -> None:
    service.delete(highlight_id)
