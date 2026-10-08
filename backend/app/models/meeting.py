from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ColumnElement,
    ForeignKey,
    Index,
    String,
    Text,
    false,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.db.types import UTCDateTime
from app.models.enums import MediaType, MeetingSource, MeetingStatus, Platform
from app.models.types import enum_check, enum_column

if TYPE_CHECKING:
    from app.models.channel import Channel
    from app.models.participant import Participant
    from app.models.tag import Tag
    from app.models.user import User


class Meeting(TimestampMixin, Base):
    __tablename__ = "meetings"
    __table_args__ = (
        enum_check("source", MeetingSource),
        enum_check("status", MeetingStatus),
        enum_check("media_type", MediaType),
        enum_check("platform", Platform),
        CheckConstraint("duration_ms >= 0", name="duration_non_negative"),
        Index("ix_meetings_started_at", "started_at"),
        Index("ix_meetings_deleted_at", "deleted_at"),
        Index("ix_meetings_channel_id", "channel_id"),
        Index("ix_meetings_host_id", "host_id"),
        # Serves the Upcoming tab: filter by status, order by start time.
        Index("ix_meetings_status_started_at", "status", "started_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(UTCDateTime())
    duration_ms: Mapped[int] = mapped_column(default=0, server_default="0")
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    channel_id: Mapped[int | None] = mapped_column(ForeignKey("channels.id", ondelete="SET NULL"))
    source: Mapped[MeetingSource] = mapped_column(
        enum_column(MeetingSource), default=MeetingSource.MANUAL
    )
    status: Mapped[MeetingStatus] = mapped_column(
        enum_column(MeetingStatus), default=MeetingStatus.COMPLETED
    )
    media_url: Mapped[str | None] = mapped_column(String(500))
    media_type: Mapped[MediaType] = mapped_column(enum_column(MediaType), default=MediaType.NONE)
    meeting_url: Mapped[str | None] = mapped_column(String(500))
    platform: Mapped[Platform | None] = mapped_column(enum_column(Platform))
    language: Mapped[str] = mapped_column(String(16), default="en", server_default="en")
    auto_join: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    deleted_at: Mapped[datetime | None] = mapped_column(UTCDateTime())

    # Read-side relationships for eager loading; writes go through repositories.
    host: Mapped["User"] = relationship(lazy="raise")
    channel: Mapped["Channel | None"] = relationship(lazy="raise", viewonly=True)
    participants: Mapped[list["Participant"]] = relationship(
        order_by="Participant.id", lazy="raise", viewonly=True
    )
    tags: Mapped[list["Tag"]] = relationship(
        secondary="meeting_tags", order_by="Tag.name", lazy="raise", viewonly=True
    )

    @classmethod
    def not_deleted(cls) -> ColumnElement[bool]:
        return cls.deleted_at.is_(None)
