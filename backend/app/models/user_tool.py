from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserTool(Base):
    """A tool the user said they use during onboarding (e.g. "zoom", "slack")."""

    __tablename__ = "user_tools"
    __table_args__ = (UniqueConstraint("user_id", "tool"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    tool: Mapped[str] = mapped_column(String(50))
