import re
from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.models.enums import JoinPreference, RecapPreference
from app.schemas.common import InputModel

# Deliberately loose: one "@", a dot in the domain, no spaces. Delivery is the real check.
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MAX_TOOLS = 20
MAX_INVITES = 20

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
JobTitle = Annotated[str, StringConstraints(strip_whitespace=True, max_length=150)]
Role = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
ToolName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]


class UserRef(BaseModel):
    """Minimal identity embedded in every meeting row."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    avatar_url: str | None = None


class UserRead(UserRef):
    email: str


class MeRead(UserRead):
    """The current user, with their onboarding answers."""

    role: str | None = None
    job_title: str | None = None
    join_preference: JoinPreference | None = None
    recap_preference: RecapPreference | None = None
    onboarded_at: datetime | None = None
    tools: list[str] = []


class OnboardingResult(MeRead):
    # Invites are not stored until the Team feature owns them; this counts the accepted ones.
    invites_sent: int


class ProfileUpdate(InputModel):
    name: Name | None = None
    job_title: JobTitle | None = None

    @field_validator("name", mode="before")
    @classmethod
    def _name_not_null(cls, value: Any) -> Any:
        if value is None:
            raise ValueError("must not be null")
        return value


class OnboardingInput(InputModel):
    join_preference: JoinPreference
    recap_preference: RecapPreference
    role: Role
    job_title: JobTitle = ""
    tools: list[ToolName] = Field(default_factory=list, max_length=MAX_TOOLS)
    invite_emails: list[str] = Field(default_factory=list, max_length=MAX_INVITES)

    @field_validator("tools")
    @classmethod
    def _dedupe_tools(cls, tools: list[str]) -> list[str]:
        return list(dict.fromkeys(t.lower() for t in tools))

    @field_validator("invite_emails")
    @classmethod
    def _valid_emails(cls, emails: list[str]) -> list[str]:
        cleaned = [e.strip().lower() for e in emails]
        bad = [e for e in cleaned if len(e) > 320 or not _EMAIL.match(e)]
        if bad:
            raise ValueError(f"invalid email address: {', '.join(bad)}")
        return list(dict.fromkeys(cleaned))


class UsageRead(BaseModel):
    free_meetings_left: int
    free_meetings_total: int
    storage_minutes_used: int
    storage_minutes_total: int
