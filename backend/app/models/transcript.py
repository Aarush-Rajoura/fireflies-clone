from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Speaker(Base):
    """Diarised voice label; maps to a participant once identified."""

    __tablename__ = "speakers"
    __table_args__ = (
        UniqueConstraint("meeting_id", "label", name="uq_speakers_meeting_id_label"),
        CheckConstraint("color_index BETWEEN 0 AND 7", name="color_index_range"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    label: Mapped[str] = mapped_column(String(100))
    participant_id: Mapped[int | None] = mapped_column(
        ForeignKey("participants.id", ondelete="SET NULL")
    )
    color_index: Mapped[int] = mapped_column(default=0, server_default="0")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"
    __table_args__ = (
        UniqueConstraint(
            "meeting_id", "sequence", name="uq_transcript_segments_meeting_id_sequence"
        ),
        CheckConstraint("start_ms >= 0 AND end_ms >= start_ms", name="time_range"),
        Index("ix_transcript_segments_meeting_id_start_ms", "meeting_id", "start_ms"),
        Index("ix_transcript_segments_speaker_id", "speaker_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    speaker_id: Mapped[int] = mapped_column(ForeignKey("speakers.id", ondelete="CASCADE"))
    sequence: Mapped[int]
    start_ms: Mapped[int]
    end_ms: Mapped[int]
    text: Mapped[str] = mapped_column(Text)
    # Kept so an edited line can be reverted.
    original_text: Mapped[str] = mapped_column(Text)
