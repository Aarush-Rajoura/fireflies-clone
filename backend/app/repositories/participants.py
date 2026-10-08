from collections.abc import Sequence

from sqlalchemy import func, select

from app.models import Meeting, Participant
from app.repositories.base import Repository


class ParticipantRepository(Repository[Participant]):
    model = Participant

    def add(self, entity: Participant) -> Participant:
        super().add(entity)
        self._expire_participants(entity.meeting_id)
        return entity

    def delete(self, entity: Participant) -> None:
        super().delete(entity)
        self._expire_participants(entity.meeting_id)

    def list_for_meeting(self, meeting_id: int) -> list[Participant]:
        stmt = (
            select(Participant).where(Participant.meeting_id == meeting_id).order_by(Participant.id)
        )
        return list(self.session.scalars(stmt))

    def get_many(self, ids: Sequence[int]) -> dict[int, Participant]:
        if not ids:
            return {}
        stmt = select(Participant).where(Participant.id.in_(ids))
        return {p.id: p for p in self.session.scalars(stmt)}

    def find_by_name(self, meeting_id: int, name: str) -> Participant | None:
        stmt = select(Participant).where(
            Participant.meeting_id == meeting_id,
            func.lower(Participant.display_name) == name.strip().lower(),
        )
        return self.session.scalar(stmt)

    def _expire_participants(self, meeting_id: int) -> None:
        # Meeting.participants is viewonly, so it would otherwise stay stale.
        meeting = self.session.get(Meeting, meeting_id)
        if meeting is not None:
            self.session.expire(meeting, ["participants"])

    def rename(self, participant: Participant, name: str) -> None:
        participant.display_name = name
        self.session.flush()
        self._expire_participants(participant.meeting_id)
