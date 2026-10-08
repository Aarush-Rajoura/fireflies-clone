"""FastAPI dependencies."""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session, sessionmaker

from app.ai.factory import get_action_item_extractor, get_question_answerer, get_summarizer
from app.ai.interfaces import ActionItemExtractor, QuestionAnswerer, Summarizer
from app.core.config import Settings
from app.db.unit_of_work import UnitOfWork
from app.parsers import default_registry
from app.services.action_items import ActionItemService
from app.services.ask import AskService
from app.services.calendar import CalendarService
from app.services.channels import ChannelService
from app.services.comments import CommentService
from app.services.export import ExportService, default_exporters
from app.services.feed import FeedService
from app.services.health import HealthService
from app.services.highlights import HighlightService
from app.services.integrations import IntegrationService
from app.services.media import MediaService
from app.services.meeting_creation import MeetingCreationService
from app.services.meetings import MeetingService
from app.services.notifications import NotificationService
from app.services.search import SearchService
from app.services.soundbites import SoundbiteService
from app.services.summary import SummaryService
from app.services.tags import TagService
from app.services.transcript import TranscriptService
from app.services.users import UserService


def get_uow(request: Request) -> Iterator[UnitOfWork]:
    # The factory lives on app.state so each app (and test) gets its own database.
    factory: sessionmaker[Session] = request.app.state.session_factory
    with UnitOfWork(factory()) as uow:
        yield uow


def get_app_settings(request: Request) -> Settings:
    return request.app.state.settings  # type: ignore[no-any-return]


Uow = Annotated[UnitOfWork, Depends(get_uow)]
AppSettings = Annotated[Settings, Depends(get_app_settings)]


def get_meeting_service(uow: Uow) -> MeetingService:
    return MeetingService(uow)


def get_channel_service(uow: Uow) -> ChannelService:
    return ChannelService(uow)


def get_transcript_service(uow: Uow) -> TranscriptService:
    return TranscriptService(uow)


def get_media_service(uow: Uow, settings: AppSettings) -> MediaService:
    return MediaService(uow, settings.media_dir)


def get_user_service(uow: Uow) -> UserService:
    return UserService(uow)


def get_search_service(uow: Uow) -> SearchService:
    return SearchService(uow)


def get_notification_service(uow: Uow) -> NotificationService:
    return NotificationService(uow)


Notifier = Annotated[NotificationService, Depends(get_notification_service)]


def get_summary_service(
    uow: Uow, summarizer: Annotated[Summarizer, Depends(get_summarizer)], notifications: Notifier
) -> SummaryService:
    return SummaryService(uow, summarizer, notifications=notifications)


def get_action_item_service(uow: Uow, notifications: Notifier) -> ActionItemService:
    return ActionItemService(uow, notifications=notifications)


def get_meeting_creation_service(
    uow: Uow,
    settings: AppSettings,
    summarizer: Annotated[Summarizer, Depends(get_summarizer)],
    extractor: Annotated[ActionItemExtractor, Depends(get_action_item_extractor)],
    notifications: Notifier,
) -> MeetingCreationService:
    return MeetingCreationService(
        uow,
        default_registry(),
        summarizer,
        extractor,
        SummaryService(uow, summarizer),
        max_upload_mb=settings.max_upload_mb,
        notifications=notifications,
    )


def get_tag_service(uow: Uow) -> TagService:
    return TagService(uow)


def get_comment_service(uow: Uow) -> CommentService:
    return CommentService(uow)


def get_highlight_service(uow: Uow) -> HighlightService:
    return HighlightService(uow)


def get_soundbite_service(uow: Uow) -> SoundbiteService:
    return SoundbiteService(uow)


def get_export_service(uow: Uow) -> ExportService:
    return ExportService(uow, default_exporters())


def get_ask_service(
    uow: Uow, answerer: Annotated[QuestionAnswerer, Depends(get_question_answerer)]
) -> AskService:
    return AskService(uow, answerer)


def get_health_service(uow: Uow) -> HealthService:
    return HealthService(uow)


def get_calendar_service(uow: Uow, notifications: Notifier) -> CalendarService:
    return CalendarService(uow, notifications)


def get_feed_service(uow: Uow) -> FeedService:
    return FeedService(uow)


def get_integration_service(uow: Uow) -> IntegrationService:
    return IntegrationService(uow)
