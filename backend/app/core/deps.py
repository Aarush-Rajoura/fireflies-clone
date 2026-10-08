"""FastAPI dependencies."""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session, sessionmaker

from app.ai.factory import get_action_item_extractor, get_summarizer
from app.ai.interfaces import ActionItemExtractor, Summarizer
from app.core.config import Settings
from app.db.unit_of_work import UnitOfWork
from app.parsers import default_registry
from app.services.action_items import ActionItemService
from app.services.channels import ChannelService
from app.services.health import HealthService
from app.services.media import MediaService
from app.services.meeting_creation import MeetingCreationService
from app.services.meetings import MeetingService
from app.services.search import SearchService
from app.services.summary import SummaryService
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


def get_summary_service(
    uow: Uow, summarizer: Annotated[Summarizer, Depends(get_summarizer)]
) -> SummaryService:
    return SummaryService(uow, summarizer)


def get_action_item_service(uow: Uow) -> ActionItemService:
    return ActionItemService(uow)


def get_meeting_creation_service(
    uow: Uow,
    settings: AppSettings,
    summarizer: Annotated[Summarizer, Depends(get_summarizer)],
    extractor: Annotated[ActionItemExtractor, Depends(get_action_item_extractor)],
) -> MeetingCreationService:
    return MeetingCreationService(
        uow,
        default_registry(),
        summarizer,
        extractor,
        SummaryService(uow, summarizer),
        max_upload_mb=settings.max_upload_mb,
    )


def get_health_service(uow: Uow) -> HealthService:
    return HealthService(uow)
