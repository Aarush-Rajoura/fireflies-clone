from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin
from app.db.types import UTCDateTime


class Comment(TimestampMixin, Base):
    __tablename__ = "comments"
    __table_args__ = (
        Index("ix_comments_meeting_id", "meeting_id"),
        Index("ix_comments_segment_id", "segment_id"),
        Index("ix_comments_author_id", "author_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    # NULL means a comment on the meeting as a whole.
    segment_id: Mapped[int | None] = mapped_column(
        ForeignKey("transcript_segments.id", ondelete="CASCADE")
    )
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    body: Mapped[str] = mapped_column(Text)
    deleted_at: Mapped[datetime | None] = mapped_column(UTCDateTime())


class Highlight(Base):
    __tablename__ = "highlights"
    __table_args__ = (
        CheckConstraint("start_offset >= 0 AND start_offset < end_offset", name="offset_range"),
        Index("ix_highlights_meeting_id", "meeting_id"),
        Index("ix_highlights_segment_id", "segment_id"),
        Index("ix_highlights_created_by", "created_by"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    segment_id: Mapped[int] = mapped_column(
        ForeignKey("transcript_segments.id", ondelete="CASCADE")
    )
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    # Character offsets inside the segment text.
    start_offset: Mapped[int]
    end_offset: Mapped[int]
    color: Mapped[str] = mapped_column(String(32))


class Soundbite(Base):
    __tablename__ = "soundbites"
    __table_args__ = (
        CheckConstraint("end_ms > start_ms", name="time_range"),
        Index("ix_soundbites_meeting_id", "meeting_id"),
        Index("ix_soundbites_created_by", "created_by"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(300))
    start_ms: Mapped[int]
    end_ms: Mapped[int]
