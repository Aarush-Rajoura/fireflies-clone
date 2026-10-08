from datetime import UTC, datetime

from sqlalchemy import ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import UTCDateTime
from app.models.enums import TeamMemberStatus, TeamRole
from app.models.types import enum_check, enum_column
from app.models.user import User


class Team(Base):
    __tablename__ = "teams"
    __table_args__ = (Index("ix_teams_created_by", "created_by"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=lambda: datetime.now(UTC))


class TeamMember(Base):
    """A seat on a team: an invitation until accepted, then an active membership."""

    __tablename__ = "team_members"
    __table_args__ = (
        enum_check("role", TeamRole),
        enum_check("status", TeamMemberStatus),
        Index("uq_team_members_user_id", "user_id", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"))
    # NULL until the invite is accepted by a registered user with that email.
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    email: Mapped[str] = mapped_column(String(320))
    display_name: Mapped[str | None] = mapped_column(String(200))
    role: Mapped[TeamRole] = mapped_column(enum_column(TeamRole))
    status: Mapped[TeamMemberStatus] = mapped_column(enum_column(TeamMemberStatus))
    invite_token: Mapped[str] = mapped_column(String(64), unique=True)
    invited_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=lambda: datetime.now(UTC))
    joined_at: Mapped[datetime | None] = mapped_column(UTCDateTime())

    # Read-side only (avatars); writes set user_id directly.
    user: Mapped[User | None] = relationship(lazy="raise", viewonly=True)


# Case-insensitive, and leading with team_id so it also serves "members of team X".
Index(
    "uq_team_members_team_email_lower",
    TeamMember.team_id,
    func.lower(TeamMember.email),
    unique=True,
)
