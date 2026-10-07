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
