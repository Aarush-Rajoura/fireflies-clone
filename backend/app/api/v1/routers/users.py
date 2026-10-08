"""The current user, their onboarding answers and plan usage, and the participant picker."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.api.params import Paging
from app.api.responses import SERVICE_UNAVAILABLE, VALIDATION
from app.core.deps import get_user_service
from app.schemas.common import Page
from app.schemas.user import (
    MeRead,
    OnboardingInput,
    OnboardingResult,
    ProfileUpdate,
    UsageRead,
    UserRead,
)
from app.services.users import UserService

router = APIRouter(tags=["users"])

Users = Annotated[UserService, Depends(get_user_service)]


@router.get("/me", response_model=MeRead, summary="The current user", responses=SERVICE_UNAVAILABLE)
def get_me(service: Users) -> MeRead:
    return service.me()


@router.patch(
    "/me",
    response_model=MeRead,
    summary="Update the current user's name or job title",
    responses={**VALIDATION, **SERVICE_UNAVAILABLE},
)
def update_me(body: ProfileUpdate, service: Users) -> MeRead:
    return service.update_profile(body)


@router.put(
    "/me/onboarding",
    response_model=OnboardingResult,
    summary="Save onboarding answers and mark onboarding complete",
    description=(
        "`tools` is the complete set (deduplicated, at most 20). `invite_emails` are invited "
        "to the user's team (created as \"<first name>'s team\" if they have none); "
        "`invites_sent` counts the new invites. No email is sent."
    ),
    responses={**VALIDATION, **SERVICE_UNAVAILABLE},
)
def complete_onboarding(body: OnboardingInput, service: Users) -> OnboardingResult:
    return service.complete_onboarding(body)


@router.delete(
    "/me/onboarding",
    status_code=204,
    response_class=Response,
    summary="Restart onboarding (clears onboarded_at; answers are kept)",
    responses=SERVICE_UNAVAILABLE,
)
def restart_onboarding(service: Users) -> None:
    service.restart_onboarding()


@router.get(
    "/me/usage",
    response_model=UsageRead,
    summary="Free-plan usage: meetings left and storage minutes",
    responses=SERVICE_UNAVAILABLE,
)
def get_usage(service: Users) -> UsageRead:
    return service.usage()


@router.get("/users", response_model=Page[UserRead], summary="List users", responses=VALIDATION)
def list_users(page: Paging, service: Users) -> Page[UserRead]:
    return service.list(page)
