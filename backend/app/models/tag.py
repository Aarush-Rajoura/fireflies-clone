from sqlalchemy import ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Tag(Base):
    __tablename__ = "tags"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    color_index: Mapped[int] = mapped_column(default=0, server_default="0")


# Case-insensitive uniqueness: "Sales" and "sales" are the same tag.
Index("uq_tags_name_lower", func.lower(Tag.name), unique=True)


class MeetingTag(Base):
    __tablename__ = "meeting_tags"
    # The PK covers lookups by meeting; the extra index serves "meetings with tag X".
    __table_args__ = (Index("ix_meeting_tags_tag_id", "tag_id"),)

    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)
