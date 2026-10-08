"""Tag use cases. Names are unique ignoring case; deleting a tag unlinks it everywhere."""

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy.exc import IntegrityError

from app.core.exceptions import ConflictError, NotFoundError, ValidationFailedError
from app.db.unit_of_work import UnitOfWork
from app.models import Tag
from app.schemas.common import Page, PageParams
from app.schemas.meeting import MeetingDetail
from app.schemas.tag import MeetingTagsUpdate, TagCreate, TagRead, TagUpdate
from app.services import meeting_mapping
from app.services.guards import meeting_not_found, require_active_meeting


def _exists() -> ConflictError:
    return ConflictError("A tag with this name exists", code="TAG_EXISTS")


class TagService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    def list(self, page: PageParams) -> Page[TagRead]:
        tags, total = self.uow.tags.page(page.page_size, page.offset)
        return Page(
            items=[TagRead.model_validate(t) for t in tags],
            page=page.page,
            page_size=page.page_size,
            total=total,
        )

    def create(self, data: TagCreate) -> TagRead:
        self._check_name_free(data.name, exclude_id=None)
        with self._name_guard():
            tag = self.uow.tags.add(Tag(name=data.name, color_index=data.color_index))
            self.uow.commit()
        return TagRead.model_validate(tag)

    def update(self, tag_id: int, data: TagUpdate) -> TagRead:
        tag = self._get(tag_id)
        if data.name is not None:
            self._check_name_free(data.name, exclude_id=tag.id)
            tag.name = data.name
        if data.color_index is not None:
            tag.color_index = data.color_index
        with self._name_guard():
            self.uow.commit()
        return TagRead.model_validate(tag)

    def delete(self, tag_id: int) -> None:
        # meeting_tags rows go with it (ON DELETE CASCADE).
        self.uow.tags.delete(self._get(tag_id))
        self.uow.commit()

    def set_for_meeting(self, meeting_id: int, data: MeetingTagsUpdate) -> MeetingDetail:
        require_active_meeting(self.uow, meeting_id)
        wanted = list(dict.fromkeys(data.tag_ids))
        unknown = sorted(set(wanted) - self.uow.tags.existing_ids(wanted))
        if unknown:
            raise ValidationFailedError(
                "Unknown tag", code="TAG_NOT_FOUND", details={"tag_ids": unknown}
            )
        self.uow.tags.replace_for_meeting(meeting_id, wanted)
        self.uow.commit()
        meeting = self.uow.meetings.get_detail(meeting_id)
        if meeting is None:
            raise meeting_not_found()
        return meeting_mapping.detail(self.uow, meeting)

    def _get(self, tag_id: int) -> Tag:
        tag = self.uow.tags.get(tag_id)
        if tag is None:
            raise NotFoundError("Tag not found", code="TAG_NOT_FOUND")
        return tag

    def _check_name_free(self, name: str, exclude_id: int | None) -> None:
        clash = self.uow.tags.get_by_name(name)
        if clash is not None and clash.id != exclude_id:
            raise _exists()

    @contextmanager
    def _name_guard(self) -> Iterator[None]:
        # The pre-check races with concurrent writers; the lower(name) index is the real guard.
        try:
            yield
        except IntegrityError as exc:
            self.uow.rollback()
            raise _exists() from exc
