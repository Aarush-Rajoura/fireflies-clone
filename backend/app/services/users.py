"""The current (demo) user: profile, onboarding answers and plan usage."""

import logging
from datetime import UTC, datetime

from app.core.exceptions import ServiceUnavailableError
from app.db.unit_of_work import UnitOfWork
from app.models import User
from app.schemas.common import Page, PageParams
from app.schemas.user import (
    MeRead,
    OnboardingInput,
    OnboardingResult,
    ProfileUpdate,
    UsageRead,
    UserRead,
)

logger = logging.getLogger(__name__)

# The free plan's limits; static until billing exists.
FREE_MEETINGS_TOTAL = 3
STORAGE_MINUTES_TOTAL = 400


def _read(user: User) -> UserRead:
    return UserRead(id=user.id, name=user.name, email=user.email, avatar_url=user.avatar_url)


class UserService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    def me(self) -> MeRead:
        return self._me_read(self._default())

    def list(self, page: PageParams) -> Page[UserRead]:
        users, total = self.uow.users.list(page.page_size, page.offset)
        return Page(
            items=[_read(u) for u in users],
            page=page.page,
            page_size=page.page_size,
            total=total,
        )

    def update_profile(self, data: ProfileUpdate) -> MeRead:
        user = self._default()
        if data.name is not None:
            user.name = data.name
        if data.job_title is not None:
            user.job_title = data.job_title or None
        self.uow.commit()
        return self._me_read(user)

    def complete_onboarding(self, data: OnboardingInput) -> OnboardingResult:
        user = self._default()
        user.join_preference = data.join_preference
        user.recap_preference = data.recap_preference
        user.role = data.role
        user.job_title = data.job_title or None
        user.onboarded_at = datetime.now(UTC)
        self.uow.users.replace_tools(user.id, data.tools)
        self.uow.commit()
        if data.invite_emails:
            # Team invites have no table yet; the Team feature will persist them.
            logger.info("onboarding invites requested", extra={"count": len(data.invite_emails)})
        return OnboardingResult(
            **self._me_read(user).model_dump(), invites_sent=len(data.invite_emails)
        )

    def restart_onboarding(self) -> None:
        """Clears the completion mark only; earlier answers stay as the wizard's defaults."""
        user = self._default()
        user.onboarded_at = None
        self.uow.commit()

    def usage(self) -> UsageRead:
        user = self._default()
        used_ms = self.uow.users.hosted_duration_ms(user.id)
        return UsageRead(
            free_meetings_left=FREE_MEETINGS_TOTAL,
            free_meetings_total=FREE_MEETINGS_TOTAL,
            storage_minutes_used=used_ms // 60_000,
            storage_minutes_total=STORAGE_MINUTES_TOTAL,
        )

    def _default(self) -> User:
        """The demo user (the first one); there is no authentication."""
        user = self.uow.users.get_default()
        if user is None:
            raise ServiceUnavailableError("Database has not been seeded", code="NOT_SEEDED")
        return user

    def _me_read(self, user: User) -> MeRead:
        return MeRead(
            id=user.id,
            name=user.name,
            email=user.email,
            avatar_url=user.avatar_url,
            role=user.role,
            job_title=user.job_title,
            join_preference=user.join_preference,
            recap_preference=user.recap_preference,
            onboarded_at=user.onboarded_at,
            tools=list(self.uow.users.tools(user.id)),
        )
