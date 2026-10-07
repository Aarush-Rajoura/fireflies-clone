from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import JoinPreference, RecapPreference
from app.models.types import enum_check, enum_column


class User(Base):
    __tablename__ = "users"

    __table_args__ = (
        enum_check("join_preference", JoinPreference),
        enum_check("recap_preference", RecapPreference),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(320), unique=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    # Onboarding answers stay NULL until the user completes onboarding.
    role: Mapped[str | None] = mapped_column(String(100))
    job_title: Mapped[str | None] = mapped_column(String(150))
    join_preference: Mapped[JoinPreference | None] = mapped_column(enum_column(JoinPreference))
    recap_preference: Mapped[RecapPreference | None] = mapped_column(enum_column(RecapPreference))
    onboarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
