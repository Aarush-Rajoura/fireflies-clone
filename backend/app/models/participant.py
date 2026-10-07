from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import ParticipantRole
from app.models.types import enum_check, enum_column


class Participant(Base):
    __tablename__ = "participants"
    __table_args__ = (
        UniqueConstraint(
            "meeting_id", "display_name", name="uq_participants_meeting_id_display_name"
        ),
        enum_check("role", ParticipantRole),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    display_name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(320))
    role: Mapped[ParticipantRole] = mapped_column(
        enum_column(ParticipantRole), default=ParticipantRole.ATTENDEE
    )
    # Denormalised from transcript segments so the analytics view needs no scan.
    talk_ms: Mapped[int] = mapped_column(default=0, server_default="0")
