"""Turns stored transcript rows into the shapes other layers consume."""

from collections.abc import Sequence

from app.ai.types import TranscriptForAI, TranscriptLine
from app.models import Meeting, Participant, Speaker, TranscriptSegment
from app.schemas.transcript import SegmentRead, SpeakerRead


def speaker_name(speaker: Speaker, participants: dict[int, Participant]) -> str:
    # Once a speaker is linked, the participant's name is the source of truth.
    linked = participants.get(speaker.participant_id) if speaker.participant_id else None
    return linked.display_name if linked else speaker.label


def speaker_read(speaker: Speaker, participants: dict[int, Participant]) -> SpeakerRead:
    return SpeakerRead(
        id=speaker.id,
        label=speaker.label,
        name=speaker_name(speaker, participants),
        color_index=speaker.color_index,
        participant_id=speaker.participant_id,
    )


def segment_read(segment: TranscriptSegment) -> SegmentRead:
    return SegmentRead(
        id=segment.id,
        sequence=segment.sequence,
        start_ms=segment.start_ms,
        end_ms=segment.end_ms,
        speaker_id=segment.speaker_id,
        text=segment.text,
        original_text=segment.original_text,
        is_edited=segment.text != segment.original_text,
    )


def build_transcript_for_ai(
    meeting: Meeting,
    segments: Sequence[TranscriptSegment],
    speakers: Sequence[Speaker],
    participants: Sequence[Participant],
) -> TranscriptForAI:
    """The single place a stored transcript becomes AI input."""
    by_participant = {p.id: p for p in participants}
    names = {s.id: speaker_name(s, by_participant) for s in speakers}
    lines = [
        TranscriptLine(
            segment_id=seg.id,
            speaker=names.get(seg.speaker_id, "Unknown"),
            start_ms=seg.start_ms,
            text=seg.text,
        )
        for seg in sorted(segments, key=lambda s: s.sequence)
    ]
    return TranscriptForAI(
        meeting_title=meeting.title,
        lines=lines,
        participants=tuple(p.display_name for p in participants),
    )
