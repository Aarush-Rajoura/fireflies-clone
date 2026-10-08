"""Unit of Work: owns the session, the transaction boundary and the repositories."""

from types import TracebackType

from sqlalchemy.orm import Session

from app.repositories.action_items import ActionItemRepository
from app.repositories.analytics import AnalyticsRepository
from app.repositories.calendar import CalendarConnectionRepository
from app.repositories.channels import ChannelRepository
from app.repositories.chat_context import ChatContextRepository
from app.repositories.chats import ChatRepository
from app.repositories.comments import CommentRepository
from app.repositories.feed import FeedRepository
from app.repositories.highlights import HighlightRepository
from app.repositories.integrations import IntegrationConnectionRepository
from app.repositories.meetings import MeetingRepository
from app.repositories.notifications import NotificationRepository
from app.repositories.participants import ParticipantRepository
from app.repositories.soundbites import SoundbiteRepository
from app.repositories.summaries import SummaryRepository
from app.repositories.tags import TagRepository
from app.repositories.teams import TeamMemberRepository, TeamRepository
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
        self.soundbites = SoundbiteRepository(session)
        self.calendar_connections = CalendarConnectionRepository(session)
        self.notifications = NotificationRepository(session)
        self.feed = FeedRepository(session)
        self.integration_connections = IntegrationConnectionRepository(session)
        self.chats = ChatRepository(session)
        self.chat_context = ChatContextRepository(session)
        self.analytics = AnalyticsRepository(session)
        self.teams = TeamRepository(session)
        self.team_members = TeamMemberRepository(session)

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
