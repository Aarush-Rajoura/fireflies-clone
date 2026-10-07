"""Unit of Work: owns the session, the transaction boundary and the repositories."""

from types import TracebackType

from sqlalchemy.orm import Session

from app.repositories.action_items import ActionItemRepository
from app.repositories.channels import ChannelRepository
from app.repositories.comments import CommentRepository
from app.repositories.highlights import HighlightRepository
from app.repositories.meetings import MeetingRepository
from app.repositories.participants import ParticipantRepository
from app.repositories.summaries import SummaryRepository
from app.repositories.tags import TagRepository
from app.repositories.transcript import TranscriptRepository
from app.repositories.users import UserRepository


class UnitOfWork:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.meetings = MeetingRepository(session)
        self.transcript = TranscriptRepository(session)
        self.summaries = SummaryRepository(session)
        self.action_items = ActionItemRepository(session)
        self.participants = ParticipantRepository(session)
        self.tags = TagRepository(session)
        self.users = UserRepository(session)
        self.channels = ChannelRepository(session)
        self.comments = CommentRepository(session)
        self.highlights = HighlightRepository(session)

    def __enter__(self) -> "UnitOfWork":
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        # Rolling back after a commit is a no-op, so this covers "left without commit".
        self.session.rollback()
        self.session.close()

    def flush(self) -> None:
        self.session.flush()

    def commit(self) -> None:
        self.session.commit()

    def rollback(self) -> None:
        self.session.rollback()
