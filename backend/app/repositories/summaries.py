from collections.abc import Sequence

from sqlalchemy import select

from app.models import Keyword, Summary, SummarySection
from app.repositories.base import Repository


class SummaryRepository(Repository[Summary]):
    model = Summary

    def get_by_meeting(self, meeting_id: int) -> Summary | None:
        return self.session.scalar(select(Summary).where(Summary.meeting_id == meeting_id))

    def sections(self, summary_id: int) -> list[SummarySection]:
        stmt = (
            select(SummarySection)
            .where(SummarySection.summary_id == summary_id)
            .order_by(SummarySection.kind, SummarySection.sequence)
        )
        return list(self.session.scalars(stmt))

    def keywords(self, meeting_id: int) -> list[Keyword]:
        stmt = (
            select(Keyword).where(Keyword.meeting_id == meeting_id).order_by(Keyword.weight.desc())
        )
        return list(self.session.scalars(stmt))

    def overviews(self, meeting_ids: Sequence[int]) -> dict[int, str]:
        if not meeting_ids:
            return {}
        stmt = select(Summary.meeting_id, Summary.overview).where(
            Summary.meeting_id.in_(meeting_ids)
        )
        return {mid: overview for mid, overview in self.session.execute(stmt)}

    def keyword_terms(self, meeting_ids: Sequence[int]) -> dict[int, list[str]]:
        """Terms per meeting, strongest first; one query for a whole page of meetings."""
        if not meeting_ids:
            return {}
        stmt = (
            select(Keyword.meeting_id, Keyword.term)
            .where(Keyword.meeting_id.in_(meeting_ids))
            .order_by(Keyword.weight.desc(), Keyword.id)
        )
        out: dict[int, list[str]] = {}
        for mid, term in self.session.execute(stmt):
            out.setdefault(mid, []).append(term)
        return out
