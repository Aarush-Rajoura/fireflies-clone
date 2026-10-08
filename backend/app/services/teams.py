"""Team use cases. One team per user; invites are simulated (a link, never an email).

`TeamService.invite` is the one entry point for inviting by email (onboarding uses it
too, with `ensure_my_team`): it takes plain strings, normalises and validates them itself.
"""

import secrets
from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationFailedError
from app.db.unit_of_work import UnitOfWork
from app.models import Team, TeamMember, User
from app.models.enums import TeamMemberStatus, TeamRole
from app.schemas.team import (
    MAX_INVITES,
    InviteSkip,
    SkipReason,
    TeamInviteResult,
    TeamMemberRead,
    TeamRead,
    normalize_email,
)
from app.services.guards import require_current_user

_MANAGERS = frozenset({TeamRole.OWNER, TeamRole.ADMIN})


def invite_path(token: str) -> str:
    return f"/join/{token}"


class TeamService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    # --- reads -----------------------------------------------------------------

    def get_my_team(self) -> TeamRead | None:
        """The team the current user has a seat on, or None."""
        me = require_current_user(self.uow)
        seat = self.uow.team_members.membership_of(me.id)
        if seat is None:
            return None
        return self._team_read(self._team(seat.team_id), seat.role)

    def require_my_team(self) -> TeamRead:
        team = self.get_my_team()
        if team is None:
            raise NotFoundError("You are not on a team yet", code="NO_TEAM")
        return team

    # --- writes ----------------------------------------------------------------

    def create_team(self, name: str) -> TeamRead:
        me = require_current_user(self.uow)
        if self.uow.team_members.membership_of(me.id) is not None:
            raise ConflictError("You already belong to a team", code="TEAM_EXISTS")
        team = self._stage_team(me, name)
        self.uow.commit()
        return self._team_read(team, TeamRole.OWNER)

    def rename(self, team_id: int, name: str) -> TeamRead:
        actor = self._manager(team_id)
        team = self._team(team_id)
        team.name = name
        self.uow.commit()
        return self._team_read(team, actor.role)

    def invite(
        self,
        team_id: int,
        emails: Sequence[str],
        role: TeamRole = TeamRole.MEMBER,
        *,
        commit: bool = True,
    ) -> TeamInviteResult:
        """Seat each new email as `invited`; emails already on the team are reported in
        `skipped`. Raises 409 MEMBER_EXISTS (before writing anything) when nothing new
        was invited. `commit=False` lets a caller's use case (onboarding) own the
        transaction."""
        self._manager(team_id)
        result = self._stage_invites(team_id, emails, role)
        if not result.invited:
            raise ConflictError(
                "Everyone listed is already on the team",
                code="MEMBER_EXISTS",
                details={"skipped": [s.model_dump() for s in result.skipped]},
            )
        if not commit:
            return result
        try:
            self.uow.commit()
        except IntegrityError as exc:
            # A concurrent invite can slip past the pre-check; the unique index decides.
            self.uow.rollback()
            raise ConflictError("Someone listed was just invited", code="MEMBER_EXISTS") from exc
        return result

    def ensure_my_team(self, name: str, *, commit: bool = True) -> int | None:
        """Id of the team the current user may manage, creating one named `name` (with
        them as owner) when they have none; None when they are on a team they may not
        manage."""
        me = require_current_user(self.uow)
        seat = self.uow.team_members.membership_of(me.id)
        if seat is None:
            team_id = self._stage_team(me, name).id
            if commit:
                self.uow.commit()
            return team_id
        if seat.status == TeamMemberStatus.ACTIVE and seat.role in _MANAGERS:
            return seat.team_id
        return None

    def change_role(self, member_id: int, role: TeamRole) -> TeamMemberRead:
        target = self._member(member_id)
        actor = self._manager(target.team_id)
        if TeamRole.OWNER in (target.role, role) and actor.role != TeamRole.OWNER:
            raise ForbiddenError("Only an owner can grant or revoke ownership")
        if target.role == TeamRole.OWNER and role != TeamRole.OWNER:
            self._ensure_not_last_owner(target)
        target.role = role
        self.uow.commit()
        return _member_read(target, target.user)

    def remove_member(self, member_id: int) -> None:
        target = self._member(member_id)
        actor = self._manager(target.team_id)
        if target.role == TeamRole.OWNER:
            if actor.role != TeamRole.OWNER:
                raise ForbiddenError("Only an owner can remove an owner")
            self._ensure_not_last_owner(target)
        self.uow.team_members.delete(target)
        self.uow.commit()

    def accept_invite(self, token: str) -> TeamMemberRead:
        """Demo stand-in for clicking the emailed link: the seat becomes active."""
        seat = self.uow.team_members.get_by_token(token)
        if seat is None:
            raise NotFoundError("Invite not found", code="INVITE_NOT_FOUND")
        if seat.status == TeamMemberStatus.ACTIVE:
            return _member_read(seat, seat.user)  # idempotent: re-opening the link is harmless
        user = self.uow.users.find_by_email_ci(seat.email.lower())
        if user is not None:
            other = self.uow.team_members.membership_of(user.id)
            if other is not None and other.team_id != seat.team_id:
                raise ConflictError("This user already belongs to a team", code="TEAM_EXISTS")
            seat.user_id = user.id
            seat.display_name = seat.display_name or user.name
        seat.status = TeamMemberStatus.ACTIVE
        seat.joined_at = datetime.now(UTC)
        self.uow.commit()
        return _member_read(seat, user)

    # --- helpers ---------------------------------------------------------------

    def _team(self, team_id: int) -> Team:
        team = self.uow.teams.get(team_id)
        if team is None:
            raise NotFoundError("Team not found", code="TEAM_NOT_FOUND")
        return team

    def _member(self, member_id: int) -> TeamMember:
        member = self.uow.team_members.get_with_user(member_id)
        if member is None:
            raise NotFoundError("Team member not found", code="MEMBER_NOT_FOUND")
        return member

    def _members(self, team_id: int) -> list[TeamMember]:
        return self.uow.team_members.list_for_team(team_id)

    def _manager(self, team_id: int) -> TeamMember:
        """The current user's active seat on `team_id`, if it may manage the team."""
        self._team(team_id)
        me = require_current_user(self.uow)
        seat = self.uow.team_members.membership_of(me.id)
        if seat is None or seat.team_id != team_id or seat.status != TeamMemberStatus.ACTIVE:
            raise ForbiddenError("You are not a member of this team")
        if seat.role not in _MANAGERS:
            raise ForbiddenError("Only owners and admins can manage the team")
        return seat

    def _ensure_not_last_owner(self, owner: TeamMember) -> None:
        if (
            owner.status == TeamMemberStatus.ACTIVE
            and self.uow.team_members.count_active_owners(owner.team_id) <= 1
        ):
            raise ConflictError("A team needs at least one owner", code="LAST_OWNER")

    def _stage_team(self, owner: User, name: str) -> Team:
        team = self.uow.teams.add(Team(name=name, created_by=owner.id))
        now = datetime.now(UTC)
        self.uow.team_members.add(
            TeamMember(
                team_id=team.id,
                user_id=owner.id,
                email=owner.email.lower(),
                display_name=owner.name,
                role=TeamRole.OWNER,
                status=TeamMemberStatus.ACTIVE,
                invite_token=_token(),
                invited_at=now,
                joined_at=now,
            )
        )
        return team

    def _stage_invites(
        self, team_id: int, emails: Sequence[str], role: TeamRole
    ) -> TeamInviteResult:
        if role == TeamRole.OWNER:
            raise ValidationFailedError(
                "Invite as admin or member, then promote", code="INVITE_ROLE_INVALID"
            )
        wanted = _normalized(emails)
        on_team = self.uow.team_members.statuses_by_email(team_id, wanted)
        skipped = [
            InviteSkip(email=e, reason=_skip_reason(on_team[e])) for e in wanted if e in on_team
        ]
        added = [self._seat_invite(team_id, e, role) for e in wanted if e not in on_team]
        return TeamInviteResult(invited=[_member_read(m, None) for m in added], skipped=skipped)

    def _seat_invite(self, team_id: int, email: str, role: TeamRole) -> TeamMember:
        known = self.uow.users.find_by_email_ci(email)
        return self.uow.team_members.add(
            TeamMember(
                team_id=team_id,
                email=email,
                display_name=known.name if known else None,
                role=role,
                status=TeamMemberStatus.INVITED,
                invite_token=_token(),
                invited_at=datetime.now(UTC),
            )
        )

    def _team_read(self, team: Team, my_role: TeamRole) -> TeamRead:
        return TeamRead(
            id=team.id,
            name=team.name,
            created_at=team.created_at,
            my_role=my_role,
            members=[_member_read(m, m.user) for m in self._members(team.id)],
        )


def _token() -> str:
    return secrets.token_urlsafe(24)


def _normalized(emails: Sequence[str]) -> list[str]:
    """Lower-cased, de-duplicated (order kept); 422 on the first malformed address."""
    if not emails or len(emails) > MAX_INVITES:
        raise ValidationFailedError(
            f"Invite between 1 and {MAX_INVITES} people at a time", code="INVITE_COUNT_INVALID"
        )
    seen: dict[str, None] = {}
    for raw in emails:
        try:
            seen[normalize_email(raw)] = None
        except ValueError as exc:
            raise ValidationFailedError(
                str(exc), code="INVALID_EMAIL", details={"email": raw}
            ) from exc
    return list(seen)


def _skip_reason(status: TeamMemberStatus) -> SkipReason:
    return "already_invited" if status == TeamMemberStatus.INVITED else "already_member"


def _member_read(member: TeamMember, user: User | None) -> TeamMemberRead:
    pending = member.status == TeamMemberStatus.INVITED
    return TeamMemberRead(
        id=member.id,
        team_id=member.team_id,
        user_id=member.user_id,
        email=member.email,
        display_name=member.display_name,
        avatar_url=user.avatar_url if user else None,
        role=member.role,
        status=member.status,
        invited_at=member.invited_at,
        joined_at=member.joined_at,
        invite_url=invite_path(member.invite_token) if pending else None,
    )
