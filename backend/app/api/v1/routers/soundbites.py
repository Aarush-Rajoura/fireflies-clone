"""Soundbites: collection under the meeting, items at the top level."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.api.params import Paging
from app.api.responses import GONE, NOT_FOUND, SERVICE_UNAVAILABLE, VALIDATION
from app.core.deps import get_soundbite_service
from app.schemas.common import Page
from app.schemas.soundbite import SoundbiteCreate, SoundbiteRead
from app.services.soundbites import SoundbiteService

router = APIRouter(tags=["soundbites"])

Soundbites = Annotated[SoundbiteService, Depends(get_soundbite_service)]


@router.get(
    "/meetings/{meeting_id}/soundbites",
    response_model=Page[SoundbiteRead],
    summary="List a meeting's soundbites (recording order)",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def list_soundbites(meeting_id: int, page: Paging, service: Soundbites) -> Page[SoundbiteRead]:
    return service.list(meeting_id, page)


@router.post(
    "/meetings/{meeting_id}/soundbites",
    status_code=201,
    response_model=SoundbiteRead,
    summary="Clip part of the recording",
    description="Length must be 3-180 s (`422 SOUNDBITE_LENGTH_INVALID`) and `end_ms` at most "
    "the meeting's `duration_ms` (`422 SOUNDBITE_OUT_OF_RANGE`).",
    responses={**NOT_FOUND, **GONE, **VALIDATION, **SERVICE_UNAVAILABLE},
)
def create_soundbite(meeting_id: int, body: SoundbiteCreate, service: Soundbites) -> SoundbiteRead:
    return service.create(meeting_id, body)


@router.delete(
    "/soundbites/{soundbite_id}",
    status_code=204,
    response_class=Response,
    summary="Delete a soundbite",
    responses={**NOT_FOUND, **GONE, **VALIDATION},
)
def delete_soundbite(soundbite_id: int, service: Soundbites) -> None:
    service.delete(soundbite_id)
