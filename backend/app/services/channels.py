"""Channel use cases. Deleting a channel never deletes its meetings."""

import re
from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy.exc import IntegrityError

from app.core.exceptions import ConflictError, NotFoundError, ValidationFailedError
from app.db.unit_of_work import UnitOfWork
from app.models import Channel
from app.schemas.channel import ChannelCreate, ChannelRead, ChannelUpdate
from app.schemas.common import Page, PageParams
from app.schemas.meeting import MeetingUpdate
from app.services.meetings import MeetingService

_NON_SLUG = re.compile(r"[^a-z0-9]+")


def slugify(name: str) -> str:
    return _NON_SLUG.sub("-", name.lower()).strip("-")


class ChannelService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    def list(self, page: PageParams) -> Page[ChannelRead]:
        rows, total = self.uow.channels.list_with_counts(page.page_size, page.offset)
        return Page(
            items=[_read(c, n) for c, n in rows],
            page=page.page,
            page_size=page.page_size,
            total=total,
        )

    def create(self, data: ChannelCreate) -> ChannelRead:
        slug = self._unique_slug(data.name, exclude_id=None)
        user = self.uow.users.get_default()
        with self._slug_guard():
            channel = self.uow.channels.add(
                Channel(name=data.name, slug=slug, created_by=user.id if user else None)
            )
            self.uow.commit()
        return _read(channel, 0)

    def rename(self, channel_id: int, data: ChannelUpdate) -> ChannelRead:
        channel = self._get(channel_id)
        channel.slug = self._unique_slug(data.name, exclude_id=channel.id)
        channel.name = data.name
        with self._slug_guard():
            self.uow.commit()
        return _read(channel, self.uow.channels.count_meetings(channel.id))

    def delete(self, channel_id: int) -> None:
        self.uow.channels.delete(self._get(channel_id))
        self.uow.commit()

    def move_meeting(self, meeting_id: int, channel_id: int | None) -> None:
        """Same rules as MeetingUpdate.channel_id, for callers that only move."""
        MeetingService(self.uow).update(meeting_id, MeetingUpdate(channel_id=channel_id))

    @contextmanager
    def _slug_guard(self) -> Iterator[None]:
        # A concurrent create can pass the slug pre-check; the unique index is the real guard.
        try:
            yield
        except IntegrityError as exc:
            self.uow.rollback()
            raise ConflictError("A channel with this name exists", code="CHANNEL_EXISTS") from exc

    def _get(self, channel_id: int) -> Channel:
        channel = self.uow.channels.get(channel_id)
        if channel is None:
            raise NotFoundError("Channel not found", code="CHANNEL_NOT_FOUND")
        return channel

    def _unique_slug(self, name: str, exclude_id: int | None) -> str:
        slug = slugify(name)
        if not slug:
            raise ValidationFailedError(
                "Channel name needs letters or digits", code="CHANNEL_NAME_INVALID"
            )
        clash = self.uow.channels.get_by_slug(slug)
        if clash is not None and clash.id != exclude_id:
            raise ConflictError("A channel with this name exists", code="CHANNEL_EXISTS")
        return slug


def _read(channel: Channel, meeting_count: int) -> ChannelRead:
    return ChannelRead(
        id=channel.id,
        name=channel.name,
        slug=channel.slug,
        is_private=channel.is_private,
        meeting_count=meeting_count,
    )
