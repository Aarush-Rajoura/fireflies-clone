from collections.abc import Sequence

from sqlalchemy import func, select, update

from app.models import Speaker, TranscriptSegment
from app.repositories.base import Repository


class TranscriptRepository(Repository[TranscriptSegment]):
    model = TranscriptSegment

    def segments(self, meeting_id: int) -> list[TranscriptSegment]:
        stmt = (
            select(TranscriptSegment)
            .where(TranscriptSegment.meeting_id == meeting_id)
            .order_by(TranscriptSegment.sequence)
        )
        return list(self.session.scalars(stmt))

    def speakers(self, meeting_id: int) -> list[Speaker]:
        stmt = select(Speaker).where(Speaker.meeting_id == meeting_id).order_by(Speaker.id)
        return list(self.session.scalars(stmt))

    def get_segment(self, segment_id: int) -> TranscriptSegment | None:
        return self.session.get(TranscriptSegment, segment_id)

    def get_speaker(self, speaker_id: int) -> Speaker | None:
        return self.session.get(Speaker, speaker_id)

    def add_speaker(self, speaker: Speaker) -> Speaker:
        self.session.add(speaker)
        self.session.flush()
        return speaker

    def bulk_add_segments(self, segments: Sequence[TranscriptSegment]) -> None:
        self.session.add_all(segments)
        self.session.flush()

    def unlink_participant(self, participant_id: int) -> None:
        self.session.execute(
            update(Speaker)
            .where(Speaker.participant_id == participant_id)
            .values(participant_id=None)
        )

    def talk_ms(self, participant_ids: Sequence[int]) -> dict[int, int]:
        """Total spoken time per participant, over the segments of their linked speakers."""
        if not participant_ids:
            return {}
        stmt = (
            select(
                Speaker.participant_id,
                func.sum(TranscriptSegment.end_ms - TranscriptSegment.start_ms),
            )
            .join(Speaker, Speaker.id == TranscriptSegment.speaker_id)
            .where(Speaker.participant_id.in_(participant_ids))
            .group_by(Speaker.participant_id)
        )
        rows = self.session.execute(stmt)
        return {int(pid): int(total or 0) for pid, total in rows if pid is not None}
