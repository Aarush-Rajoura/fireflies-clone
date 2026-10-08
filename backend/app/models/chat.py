from datetime import UTC, datetime

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin
from app.db.types import UTCDateTime
from app.models.enums import ChatRole
from app.models.types import enum_check, enum_column


class ChatThread(TimestampMixin, Base):
    """One AskFred conversation; `updated_at` moves with each exchange so lists sort by activity."""

    __tablename__ = "chat_threads"
    __table_args__ = (
        Index("ix_chat_threads_user_id_updated_at", "user_id", "updated_at"),
        Index("ix_chat_threads_meeting_id", "meeting_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    # The meeting most recently @-mentioned in the thread, if any.
    meeting_id: Mapped[int | None] = mapped_column(ForeignKey("meetings.id", ondelete="SET NULL"))


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = (
        enum_check("role", ChatRole),
        Index("ix_chat_messages_thread_id_created_at", "thread_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("chat_threads.id", ondelete="CASCADE"))
    role: Mapped[ChatRole] = mapped_column(enum_column(ChatRole))
    content: Mapped[str] = mapped_column(Text)
    # A plain string, not an enum: adding a skill must not need a migration.
    skill: Mapped[str | None] = mapped_column(String(50))
    provider: Mapped[str | None] = mapped_column(String(50))
    model: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=lambda: datetime.now(UTC))


class ChatCitation(Base):
    __tablename__ = "chat_citations"
    __table_args__ = (
        Index("ix_chat_citations_message_id", "message_id"),
        Index("ix_chat_citations_meeting_id", "meeting_id"),
        Index("ix_chat_citations_segment_id", "segment_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("chat_messages.id", ondelete="CASCADE"))
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    segment_id: Mapped[int | None] = mapped_column(
        ForeignKey("transcript_segments.id", ondelete="SET NULL")
    )
    start_ms: Mapped[int | None]
    quote: Mapped[str] = mapped_column(Text)
