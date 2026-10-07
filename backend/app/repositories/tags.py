from sqlalchemy import func, select

from app.models import MeetingTag, Tag
from app.repositories.base import Repository


class TagRepository(Repository[Tag]):
    model = Tag

    def list_all(self) -> list[Tag]:
        return list(self.session.scalars(select(Tag).order_by(func.lower(Tag.name))))

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

    def detach(self, meeting_id: int, tag_id: int) -> None:
        link = self.session.get(MeetingTag, (meeting_id, tag_id))
        if link is not None:
            self.session.delete(link)
            self.session.flush()
