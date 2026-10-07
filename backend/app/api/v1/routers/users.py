"""The current user and the participant picker."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.params import Paging
from app.api.responses import SERVICE_UNAVAILABLE, VALIDATION
from app.core.deps import CurrentUser, get_user_service
from app.schemas.common import Page
from app.schemas.user import UserRead
from app.services.users import UserService

router = APIRouter(tags=["users"])


@router.get(
    "/me", response_model=UserRead, summary="The current user", responses=SERVICE_UNAVAILABLE
)
def get_me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)


@router.get("/users", response_model=Page[UserRead], summary="List users", responses=VALIDATION)
def list_users(
    page: Paging, service: Annotated[UserService, Depends(get_user_service)]
) -> Page[UserRead]:
    return service.list(page)
