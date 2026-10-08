"""Home dashboard state: simulated calendar connections and in-app notifications."""

from datetime import UTC, datetime

from sqlalchemy import ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.types import UTCDateTime
from app.models.enums import CalendarProvider, NotificationKind
from app.models.types import enum_check, enum_column


def _now() -> datetime:
    return datetime.now(UTC)


class CalendarConnection(Base):
    __tablename__ = "calendar_connections"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_calendar_connections_user_id_provider"),
        enum_check("provider", CalendarProvider),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    provider: Mapped[CalendarProvider] = mapped_column(enum_column(CalendarProvider))
    connected_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=_now)


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        enum_check("kind", NotificationKind),
        # Serves "unread first" and the unread check behind the bell's dot.
        Index("ix_notifications_user_id_read_at", "user_id", "read_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    kind: Mapped[NotificationKind] = mapped_column(enum_column(NotificationKind))
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text, default="", server_default="")
    link: Mapped[str | None] = mapped_column(String(500))
    read_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=_now)
