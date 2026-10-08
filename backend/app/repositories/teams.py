from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models import Team, TeamMember
from app.models.enums import TeamMemberStatus, TeamRole
from app.repositories.base import Repository


class TeamRepository(Repository[Team]):
    model = Team


class TeamMemberRepository(Repository[TeamMember]):
    model = TeamMember

    def membership_of(self, user_id: int) -> TeamMember | None:
        """The user's seat, if any (one team per user, so at most one row)."""
        stmt = select(TeamMember).where(TeamMember.user_id == user_id).order_by(TeamMember.id)
        return self.session.scalar(stmt.limit(1))

    def list_for_team(self, team_id: int) -> list[TeamMember]:
        stmt = (
            select(TeamMember)
            .where(TeamMember.team_id == team_id)
            .options(selectinload(TeamMember.user))
            .order_by(TeamMember.invited_at, TeamMember.id)
        )
        return list(self.session.scalars(stmt))

    def get_with_user(self, member_id: int) -> TeamMember | None:
        stmt = (
            select(TeamMember)
            .where(TeamMember.id == member_id)
            .options(selectinload(TeamMember.user))
        )
        return self.session.scalar(stmt)

    def get_by_token(self, token: str) -> TeamMember | None:
        stmt = (
            select(TeamMember)
            .where(TeamMember.invite_token == token)
            .options(selectinload(TeamMember.user))
        )
        return self.session.scalar(stmt)

    def statuses_by_email(self, team_id: int, emails: list[str]) -> dict[str, TeamMemberStatus]:
        """Seat status keyed by email, for those of these (lower-cased) emails on the team."""
        if not emails:
            return {}
        lowered = func.lower(TeamMember.email)
        stmt = select(lowered, TeamMember.status).where(
            TeamMember.team_id == team_id, lowered.in_(emails)
        )
        return {email: status for email, status in self.session.execute(stmt)}

    def count_active_owners(self, team_id: int) -> int:
        stmt = select(func.count()).where(
            TeamMember.team_id == team_id,
            TeamMember.role == TeamRole.OWNER,
            TeamMember.status == TeamMemberStatus.ACTIVE,
        )
        return self.session.scalar(stmt) or 0
