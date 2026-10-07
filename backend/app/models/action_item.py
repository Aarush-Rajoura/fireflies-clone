from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin
from app.db.types import UTCDateTime
from app.models.enums import ActionItemSource, ActionItemStatus
from app.models.types import enum_check, enum_column


class ActionItem(TimestampMixin, Base):
    __tablename__ = "action_items"
    __table_args__ = (
        enum_check("status", ActionItemStatus),
        enum_check("source", ActionItemSource),
        Index("ix_action_items_meeting_id_status", "meeting_id", "status"),
        Index("ix_action_items_assignee_participant_id", "assignee_participant_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(Text)
    assignee_participant_id: Mapped[int | None] = mapped_column(
        ForeignKey("participants.id", ondelete="SET NULL")
    )
    due_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[ActionItemStatus] = mapped_column(
        enum_column(ActionItemStatus), default=ActionItemStatus.OPEN
    )
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    source: Mapped[ActionItemSource] = mapped_column(
        enum_column(ActionItemSource), default=ActionItemSource.MANUAL
    )
    start_ms: Mapped[int | None]
    sequence: Mapped[int] = mapped_column(default=0, server_default="0")
