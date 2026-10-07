from collections.abc import Sequence

from sqlalchemy import select

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
