from datetime import UTC, datetime

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.types import UTCDateTime


class IntegrationConnection(Base):
    """A user's (simulated) link to a catalogue integration; the catalogue itself lives in code."""

    __tablename__ = "integration_connections"
    # The unique pair also serves "every connection of user X" lookups.
    __table_args__ = (UniqueConstraint("user_id", "integration_key"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    integration_key: Mapped[str] = mapped_column(String(64))
    connected_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=lambda: datetime.now(UTC))
