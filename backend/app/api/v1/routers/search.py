"""Transcript search."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.params import Paging
from app.api.responses import VALIDATION
from app.core.deps import get_search_service
from app.schemas.common import Page
from app.schemas.search import SearchHit
from app.services.search import SearchService

router = APIRouter(tags=["search"])


@router.get(
    "/search",
    response_model=Page[SearchHit],
    summary="Search transcripts",
    responses=VALIDATION,
)
def search(
    q: Annotated[str, Query(description="Words to find; matches are ranked by relevance.")],
    page: Paging,
    service: Annotated[SearchService, Depends(get_search_service)],
) -> Page[SearchHit]:
    return service.search(q, page)
