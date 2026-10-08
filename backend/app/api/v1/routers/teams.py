"""Teams, their members and (simulated) invites. No email is ever sent."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.api.responses import CONFLICT, FORBIDDEN, NOT_FOUND, SERVICE_UNAVAILABLE, VALIDATION
from app.core.deps import get_team_service
from app.schemas.team import (
    TeamCreate,
    TeamInviteCreate,
    TeamInviteResult,
    TeamMemberRead,
    TeamMemberUpdate,
    TeamRead,
    TeamUpdate,
)
from app.services.teams import TeamService

router = APIRouter(tags=["teams"])

Teams = Annotated[TeamService, Depends(get_team_service)]


@router.get(
    "/teams/me",
    response_model=TeamRead,
    summary="The current user's team (404 NO_TEAM when they have none)",
    responses={**NOT_FOUND, **SERVICE_UNAVAILABLE},
)
def get_my_team(service: Teams) -> TeamRead:
    return service.require_my_team()


@router.post(
    "/teams",
    status_code=201,
    response_model=TeamRead,
    summary="Create a team; the creator becomes its owner",
    responses={**VALIDATION, **CONFLICT, **SERVICE_UNAVAILABLE},
)
def create_team(body: TeamCreate, service: Teams) -> TeamRead:
    return service.create_team(body.name)


@router.patch(
    "/teams/{team_id}",
    response_model=TeamRead,
    summary="Rename a team",
    responses={**NOT_FOUND, **FORBIDDEN, **VALIDATION},
)
def rename_team(team_id: int, body: TeamUpdate, service: Teams) -> TeamRead:
    return service.rename(team_id, body.name)


@router.post(
    "/teams/{team_id}/members",
    status_code=201,
    response_model=TeamInviteResult,
    summary="Invite people by email; returns invite links (no email is sent)",
    responses={**NOT_FOUND, **FORBIDDEN, **VALIDATION, **CONFLICT},
)
def invite_members(team_id: int, body: TeamInviteCreate, service: Teams) -> TeamInviteResult:
    return service.invite(team_id, body.emails, body.role)


@router.patch(
    "/team-members/{member_id}",
    response_model=TeamMemberRead,
    summary="Change a member's role",
    responses={**NOT_FOUND, **FORBIDDEN, **VALIDATION, **CONFLICT},
)
def change_member_role(member_id: int, body: TeamMemberUpdate, service: Teams) -> TeamMemberRead:
    return service.change_role(member_id, body.role)


@router.delete(
    "/team-members/{member_id}",
    status_code=204,
    response_class=Response,
    summary="Remove a member or revoke an invite",
    responses={**NOT_FOUND, **FORBIDDEN, **VALIDATION, **CONFLICT},
)
def remove_member(member_id: int, service: Teams) -> None:
    service.remove_member(member_id)


@router.post(
    "/team-invites/{token}/accept",
    response_model=TeamMemberRead,
    summary="Accept an invite (demo stand-in for opening the emailed link)",
    responses={**NOT_FOUND, **CONFLICT, **VALIDATION},
)
def accept_invite(token: str, service: Teams) -> TeamMemberRead:
    return service.accept_invite(token)
