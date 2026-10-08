from collections.abc import Sequence

from sqlalchemy import delete, func, select

from app.models import Meeting, MeetingTag, Tag
from app.repositories.base import Repository


class TagRepository(Repository[Tag]):
    model = Tag

    def list_all(self) -> list[Tag]:
        return list(self.session.scalars(select(Tag).order_by(func.lower(Tag.name))))

    def page(self, limit: int, offset: int) -> tuple[list[Tag], int]:
        total = self.session.scalar(select(func.count()).select_from(Tag)) or 0
        stmt = select(Tag).order_by(func.lower(Tag.name), Tag.id).limit(limit).offset(offset)
        return list(self.session.scalars(stmt)), total

    def existing_ids(self, ids: Sequence[int]) -> set[int]:
        if not ids:
            return set()
        return set(self.session.scalars(select(Tag.id).where(Tag.id.in_(ids))))

    def replace_for_meeting(self, meeting_id: int, tag_ids: Sequence[int]) -> None:
        self.session.execute(delete(MeetingTag).where(MeetingTag.meeting_id == meeting_id))
        self.session.add_all(MeetingTag(meeting_id=meeting_id, tag_id=t) for t in set(tag_ids))
        self.session.flush()
        self._expire_tags(meeting_id)

    def get_by_name(self, name: str) -> Tag | None:
        # Matches the case-insensitive unique index on lower(name).
        return self.session.scalar(select(Tag).where(func.lower(Tag.name) == name.lower()))

    def for_meeting(self, meeting_id: int) -> list[Tag]:
        stmt = (
            select(Tag)
            .join(MeetingTag, MeetingTag.tag_id == Tag.id)
            .where(MeetingTag.meeting_id == meeting_id)
            .order_by(Tag.name)
        )
        return list(self.session.scalars(stmt))

    def attach(self, meeting_id: int, tag_id: int) -> None:
        if self.session.get(MeetingTag, (meeting_id, tag_id)) is None:
            self.session.add(MeetingTag(meeting_id=meeting_id, tag_id=tag_id))
            self.session.flush()
            self._expire_tags(meeting_id)

    def detach(self, meeting_id: int, tag_id: int) -> None:
        link = self.session.get(MeetingTag, (meeting_id, tag_id))
        if link is not None:
            self.session.delete(link)
            self.session.flush()
            self._expire_tags(meeting_id)

    def _expire_tags(self, meeting_id: int) -> None:
        # Meeting.tags is viewonly, so it would otherwise stay stale in the identity map.
        meeting = self.session.get(Meeting, meeting_id)
        if meeting is not None:
            self.session.expire(meeting, ["tags"])
