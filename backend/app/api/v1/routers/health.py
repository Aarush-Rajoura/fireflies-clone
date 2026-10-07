from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.responses import SERVICE_UNAVAILABLE
from app.core.deps import AppSettings, get_health_service
from app.services.health import HealthService

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    db: str
    version: str
    ai_provider: str


@router.get("/health", responses=SERVICE_UNAVAILABLE)
def health(
    settings: AppSettings, service: Annotated[HealthService, Depends(get_health_service)]
) -> HealthResponse:
    service.check_database()
    return HealthResponse(
        status="ok", db="up", version=settings.app_version, ai_provider=settings.ai_provider
    )
