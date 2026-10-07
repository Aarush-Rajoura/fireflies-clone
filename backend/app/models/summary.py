from datetime import UTC, datetime

from sqlalchemy import Boolean, ForeignKey, Index, String, Text, UniqueConstraint, false
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.types import UTCDateTime
from app.models.enums import SectionKind
from app.models.types import enum_check, enum_column


class Summary(Base):
    __tablename__ = "summaries"
    __table_args__ = (UniqueConstraint("meeting_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    overview: Mapped[str] = mapped_column(Text, default="", server_default="")
    provider: Mapped[str | None] = mapped_column(String(50))
    model: Mapped[str | None] = mapped_column(String(100))
    generated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=lambda: datetime.now(UTC))
    # Set when the transcript changed after generation.
    is_stale: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    # Non-null while a regeneration runs; lets a stuck marker be detected by age.
    generating_since: Mapped[datetime | None] = mapped_column(UTCDateTime())


class SummarySection(Base):
    __tablename__ = "summary_sections"
    __table_args__ = (
        enum_check("kind", SectionKind),
        Index("ix_summary_sections_summary_id_kind_sequence", "summary_id", "kind", "sequence"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    summary_id: Mapped[int] = mapped_column(ForeignKey("summaries.id", ondelete="CASCADE"))
    kind: Mapped[SectionKind] = mapped_column(enum_column(SectionKind))
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text, default="", server_default="")
    start_ms: Mapped[int | None]
    sequence: Mapped[int]


class Keyword(Base):
    __tablename__ = "keywords"
    __table_args__ = (UniqueConstraint("meeting_id", "term", name="uq_keywords_meeting_id_term"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    term: Mapped[str] = mapped_column(String(100))
    weight: Mapped[float] = mapped_column(default=1.0, server_default="1.0")
