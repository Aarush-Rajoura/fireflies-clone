"""Transcript reads and edits. Edits mark the summary stale; they never re-run the AI."""

from app.core.exceptions import NotFoundError, ValidationFailedError
from app.db.unit_of_work import UnitOfWork
from app.models import Participant
from app.models.enums import ParticipantRole
from app.schemas.transcript import SegmentRead, SpeakerRead, TranscriptRead
from app.services.meetings import MeetingService
from app.services.transcript_text import segment_read, speaker_read


def _clean(value: str, what: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValidationFailedError(f"{what} cannot be blank", code="VALIDATION_ERROR")
    return cleaned


class TranscriptService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow
        self._meetings = MeetingService(uow)

    def get(self, meeting_id: int) -> TranscriptRead:
        self._meetings.get_active_or_raise(meeting_id)
        participants = {p.id: p for p in self.uow.participants.list_for_meeting(meeting_id)}
        return TranscriptRead(
            speakers=[
                speaker_read(s, participants) for s in self.uow.transcript.speakers(meeting_id)
            ],
            segments=[segment_read(s) for s in self.uow.transcript.segments(meeting_id)],
        )

    def update_segment(self, segment_id: int, text: str) -> SegmentRead:
        segment = self.uow.transcript.get_segment(segment_id)
        if segment is None:
            raise NotFoundError("Segment not found", code="SEGMENT_NOT_FOUND")
        self._meetings.get_active_or_raise(segment.meeting_id)
        # original_text is written at insert time, so the first edit's baseline is preserved.
        segment.text = _clean(text, "Text")
        summary = self.uow.summaries.get_by_meeting(segment.meeting_id)
        if summary is not None:
            summary.is_stale = True
        self.uow.transcript.flush()
        self.uow.commit()
        return segment_read(segment)

    def rename_speaker(self, speaker_id: int, name: str) -> SpeakerRead:
        speaker = self.uow.transcript.get_speaker(speaker_id)
        if speaker is None:
            raise NotFoundError("Speaker not found", code="SPEAKER_NOT_FOUND")
        self._meetings.get_active_or_raise(speaker.meeting_id)
        name = _clean(name, "Name")
        repo = self.uow.participants
        match = repo.find_by_name(speaker.meeting_id, name)
        if match is not None:
            speaker.participant_id = match.id
        elif speaker.participant_id is not None:
            linked = repo.get(speaker.participant_id)
            if linked is not None:
                repo.rename(linked, name)
        else:
            created = repo.add(
                Participant(
                    meeting_id=speaker.meeting_id,
                    display_name=name,
                    role=ParticipantRole.ATTENDEE,
                )
            )
            speaker.participant_id = created.id
        self.uow.transcript.flush()
        self.uow.commit()
        participants = {p.id: p for p in repo.list_for_meeting(speaker.meeting_id)}
        return speaker_read(speaker, participants)
