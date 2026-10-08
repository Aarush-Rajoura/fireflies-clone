"""Simulated calendar connections.

No real OAuth: connecting records the connection and imports three labelled sample
meetings so the Upcoming tab has something to show. Disconnecting removes only the
meetings that provider imported and the user has not edited since.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, time, timedelta

from sqlalchemy.exc import IntegrityError

from app.core.exceptions import NotFoundError
from app.db.unit_of_work import UnitOfWork
from app.models import CalendarConnection, Meeting, Participant
from app.models.enums import (
    CalendarProvider,
    MediaType,
    MeetingSource,
    MeetingStatus,
    ParticipantRole,
)
from app.schemas.common import Page, PageParams
from app.schemas.home import CalendarConnectionCreate, CalendarConnectionRead
from app.services.guards import require_current_user
from app.services.notifications import NotificationService
from app.services.platforms import detect_platform

DEMO_LABEL = "(demo import)"

PROVIDER_NAMES = {
    CalendarProvider.GOOGLE: "Google Calendar",
    CalendarProvider.OUTLOOK: "Outlook Calendar",
}


@dataclass(frozen=True)
class _Sample:
    title: str
    days_ahead: int
    at: time
    url: str


_SAMPLES: dict[CalendarProvider, tuple[_Sample, ...]] = {
    CalendarProvider.GOOGLE: (
        _Sample("Design review", 1, time(10, 0), "https://meet.google.com/abc-defg-hij"),
        _Sample("Customer onboarding call", 2, time(14, 30), "https://zoom.us/j/5550101"),
        _Sample("Weekly product sync", 4, time(16, 0), "https://meet.google.com/xyz-uvwx-rst"),
    ),
    CalendarProvider.OUTLOOK: (
        _Sample(
            "Quarterly planning", 1, time(9, 30), "https://teams.microsoft.com/l/meetup-join/q3"
        ),
        _Sample("Vendor check-in", 3, time(13, 0), "https://teams.microsoft.com/l/meetup-join/vc"),
        _Sample("Team retrospective", 5, time(15, 0), "https://zoom.us/j/5550202"),
    ),
}

SAMPLE_COUNT = 3


@dataclass(frozen=True)
class ConnectResult:
    connection: CalendarConnectionRead
    # False when the provider was already connected (idempotent repeat).
    created: bool


class CalendarService:
    def __init__(self, uow: UnitOfWork, notifications: NotificationService) -> None:
        self.uow = uow
        self.notifications = notifications

    def list(self, page: PageParams) -> Page[CalendarConnectionRead]:
        user = require_current_user(self.uow)
        rows, total = self.uow.calendar_connections.list_for(user.id, page.page_size, page.offset)
        return Page(
            items=[CalendarConnectionRead.model_validate(c) for c in rows],
            page=page.page,
            page_size=page.page_size,
            total=total,
        )

    def connect(
        self, data: CalendarConnectionCreate, *, now: datetime | None = None
    ) -> ConnectResult:
        user = require_current_user(self.uow)
        repo = self.uow.calendar_connections
        existing = repo.get_for(user.id, data.provider)
        if existing is not None:
            return ConnectResult(CalendarConnectionRead.model_validate(existing), created=False)
        try:
            connection = repo.add(CalendarConnection(user_id=user.id, provider=data.provider))
            self._import_samples(user.id, user.name, data.provider, now or datetime.now(UTC))
            self.uow.commit()
        except IntegrityError:
            # A concurrent connect won the unique (user, provider) race: theirs stands.
            self.uow.rollback()
            winner = repo.get_for(user.id, data.provider)
            if winner is None:
                raise
            return ConnectResult(CalendarConnectionRead.model_validate(winner), created=False)
        read = CalendarConnectionRead.model_validate(connection)
        self.notifications.notify_calendar_connected(PROVIDER_NAMES[data.provider], SAMPLE_COUNT)
        return ConnectResult(read, created=True)

    def disconnect(self, provider: CalendarProvider) -> None:
        user = require_current_user(self.uow)
        repo = self.uow.calendar_connections
        connection = repo.get_for(user.id, provider)
        if connection is None:
            raise NotFoundError("Calendar is not connected", code="CALENDAR_NOT_CONNECTED")
        repo.soft_delete_imported(user.id, provider, datetime.now(UTC))
        repo.delete(connection)
        self.uow.commit()

    def _import_samples(
        self, host_id: int, host_name: str, provider: CalendarProvider, now: datetime
    ) -> None:
        today = now.astimezone(UTC).date()
        # Equal stamps mark a row as untouched; disconnect removes only those.
        stamp = datetime.now(UTC)
        for sample in _SAMPLES[provider]:
            day = today + timedelta(days=sample.days_ahead)
            meeting = self.uow.meetings.add(
                Meeting(
                    title=sample.title,
                    description=f"{DEMO_LABEL} Sample event from {PROVIDER_NAMES[provider]}.",
                    started_at=datetime.combine(day, sample.at, tzinfo=UTC),
                    host_id=host_id,
                    source=MeetingSource.CALENDAR,
                    status=MeetingStatus.SCHEDULED,
                    media_type=MediaType.NONE,
                    meeting_url=sample.url,
                    platform=detect_platform(sample.url),
                    auto_join=True,
                    calendar_provider=provider,
                    created_at=stamp,
                    updated_at=stamp,
                )
            )
            self.uow.participants.add(
                Participant(
                    meeting_id=meeting.id,
                    display_name=host_name,
                    user_id=host_id,
                    role=ParticipantRole.HOST,
                )
            )
