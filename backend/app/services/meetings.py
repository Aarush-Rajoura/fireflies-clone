"""Meeting use cases: list, read, edit, soft-delete and restore."""

from collections.abc import Sequence

from sqlalchemy.exc import IntegrityError

from app.core.exceptions import (
    ConflictError,
    ServiceUnavailableError,
    ValidationFailedError,
)
from app.db.unit_of_work import UnitOfWork
from app.models import Meeting, Participant
from app.models.enums import ParticipantRole
from app.repositories.meeting_filters import MeetingFilters, MeetingSort
from app.schemas.common import Page, PageParams
from app.schemas.meeting import MeetingDetail, MeetingListItem, MeetingUpdate, ParticipantInput
from app.services import meeting_mapping
from app.services.guards import meeting_not_found, require_active_meeting

__all__ = ["MeetingFilters", "MeetingService", "MeetingSort"]


class MeetingService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    def list(
        self, filters: MeetingFilters, page: PageParams, sort: MeetingSort
    ) -> Page[MeetingListItem]:
        user = self.uow.users.get_default()
        if user is None:
            raise ServiceUnavailableError("Database has not been seeded", code="NOT_SEEDED")
        meetings, total = self.uow.meetings.list(filters, page, sort, current_user_id=user.id)
        return Page(
            items=meeting_mapping.list_items(self.uow, meetings),
            page=page.page,
            page_size=page.page_size,
            total=total,
        )

    def get(self, meeting_id: int) -> MeetingDetail:
        self.get_active_or_raise(meeting_id)
        return self._detail(meeting_id)

    def get_active_or_raise(self, meeting_id: int) -> Meeting:
        return require_active_meeting(self.uow, meeting_id)

    def update(self, meeting_id: int, data: MeetingUpdate) -> MeetingDetail:
        meeting = self.get_active_or_raise(meeting_id)
        fields = data.model_fields_set
        if "title" in fields and data.title is not None:
            meeting.title = data.title
        if "description" in fields:
            meeting.description = data.description
        if "started_at" in fields and data.started_at is not None:
            meeting.started_at = data.started_at
        if "channel_id" in fields:
            self._set_channel(meeting, data.channel_id)
        try:
            if data.participants is not None:
                self._sync_participants(meeting, data.participants)
            self.uow.commit()
        except IntegrityError as exc:
            self.uow.rollback()
            raise ConflictError(
                "Two participants would share a name", code="PARTICIPANT_NAME_TAKEN"
            ) from exc
        return self._detail(meeting_id)

    def delete(self, meeting_id: int) -> None:
        meeting = self.get_active_or_raise(meeting_id)
        self.uow.meetings.soft_delete(meeting)
        self.uow.commit()

    def restore(self, meeting_id: int) -> MeetingDetail:
        meeting = self.uow.meetings.get(meeting_id, include_deleted=True)
        if meeting is None:
            raise meeting_not_found()
        if meeting.deleted_at is not None:
            self.uow.meetings.restore(meeting)
            self.uow.commit()
        return self._detail(meeting_id)

    def _detail(self, meeting_id: int) -> MeetingDetail:
        meeting = self.uow.meetings.get_detail(meeting_id)
        if meeting is None:
            raise meeting_not_found()
        return meeting_mapping.detail(self.uow, meeting)

    def _set_channel(self, meeting: Meeting, channel_id: int | None) -> None:
        if channel_id is not None and self.uow.channels.get(channel_id) is None:
            raise ValidationFailedError(
                "Channel does not exist",
                code="CHANNEL_NOT_FOUND",
                details={"channel_id": channel_id},
            )
        meeting.channel_id = channel_id

    def _sync_participants(self, meeting: Meeting, wanted: Sequence[ParticipantInput]) -> None:
        """Make the participant set match `wanted`.

        An entry with an id keeps that row (a rename); without one it matches by name or
        is created. Rows left out are removed and their speakers fall back to the raw label.
        """
        repo = self.uow.participants
        existing = {p.id: p for p in repo.list_for_meeting(meeting.id)}
        unknown = [w.id for w in wanted if w.id is not None and w.id not in existing]
        if unknown:
            raise ValidationFailedError(
                "Unknown participant", code="PARTICIPANT_NOT_FOUND", details={"ids": unknown}
            )
        claimed = {w.id for w in wanted if w.id is not None}
        by_name = {p.display_name.lower(): p for p in existing.values() if p.id not in claimed}
        plan: list[tuple[Participant | None, str]] = []
        for w in wanted:
            row = existing[w.id] if w.id is not None else by_name.pop(w.display_name.lower(), None)
            plan.append((row, w.display_name))
        kept = {row.id for row, _ in plan if row is not None}
        for pid, row in existing.items():
            if pid not in kept:
                self.uow.transcript.unlink_participant(pid)
                repo.delete(row)
        renames = [(row, name) for row, name in plan if row and row.display_name != name]
        # Names are unique per meeting, so a swap (A<->B) must pass through placeholders.
        for row, _ in renames:
            repo.rename(row, f"\x00{row.id}")
        for row, name in renames:
            repo.rename(row, name)
        for row, name in plan:
            if row is None:
                repo.add(
                    Participant(
                        meeting_id=meeting.id, display_name=name, role=ParticipantRole.ATTENDEE
                    )
                )
