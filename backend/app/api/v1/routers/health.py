from typing import Annotated

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.deps import get_uow
from app.core.exceptions import ServiceUnavailableError
from app.db.unit_of_work import UnitOfWork
from app.schemas.common import ErrorResponse

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    db: str
    version: str
    ai_provider: str


@router.get("/health", responses={503: {"model": ErrorResponse}})
def health(request: Request, uow: Annotated[UnitOfWork, Depends(get_uow)]) -> HealthResponse:
    try:
        uow.session.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise ServiceUnavailableError("Database is unreachable") from exc
    settings = request.app.state.settings
    return HealthResponse(
        status="ok", db="up", version=settings.app_version, ai_provider=settings.ai_provider
    )
