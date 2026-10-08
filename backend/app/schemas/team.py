import re
from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, Field, StringConstraints

from app.models.enums import TeamMemberStatus, TeamRole
from app.schemas.common import InputModel

# Deliberately loose (one @, a dot in the domain): no email is ever sent, so
# this only catches typos, not deliverability.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MAX_INVITES = 20


def normalize_email(value: str) -> str:
    """Trimmed and lower-cased; raises ValueError when it does not look like an email."""
    email = value.strip().lower()
    if len(email) > 320 or not _EMAIL_RE.match(email):
        raise ValueError(f"'{value.strip()}' is not a valid email address")
    return email


TeamName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Email = Annotated[str, AfterValidator(normalize_email)]
# Ownership is granted by promoting an existing member, never by invitation.
InviteRole = Literal[TeamRole.ADMIN, TeamRole.MEMBER]
SkipReason = Literal["already_member", "already_invited"]


class TeamCreate(InputModel):
    name: TeamName


class TeamUpdate(InputModel):
    name: TeamName


class TeamInviteCreate(InputModel):
    emails: list[Email] = Field(min_length=1, max_length=MAX_INVITES)
    role: InviteRole = TeamRole.MEMBER


class TeamMemberUpdate(InputModel):
    role: TeamRole


class TeamMemberRead(BaseModel):
    id: int
    team_id: int
    user_id: int | None
    email: str
    display_name: str | None
    avatar_url: str | None
    role: TeamRole
    status: TeamMemberStatus
    invited_at: datetime
    joined_at: datetime | None
    # Relative app path (`/join/{token}`) while the invite is pending; null once active.
    invite_url: str | None


class TeamRead(BaseModel):
    id: int
    name: str
    created_at: datetime
    my_role: TeamRole
    members: list[TeamMemberRead]


class InviteSkip(BaseModel):
    email: str
    reason: SkipReason


class TeamInviteResult(BaseModel):
    invited: list[TeamMemberRead]
    skipped: list[InviteSkip]
