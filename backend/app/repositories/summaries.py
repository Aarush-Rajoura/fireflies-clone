from collections.abc import Sequence
from datetime import datetime
from typing import Any, cast

from sqlalchemy import CursorResult, Executable, delete, or_, select, update

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

    def claim(self, summary: Summary, token: datetime, abandoned_before: datetime) -> bool:
        """Conditional UPDATE so two concurrent callers cannot both win the claim.

        `token` (the claim time) identifies the owner for `release_claim`/`delete_if_claimed`.
        """
        won = self._rowcount(
            update(Summary)
            .where(
                Summary.id == summary.id,
                or_(
                    Summary.generating_since.is_(None),
                    Summary.generating_since < abandoned_before,
                ),
            )
            .values(generating_since=token)
            .execution_options(synchronize_session=False)
        )
        self.session.expire(summary, ["generating_since"])
        return won

    def release_claim(self, summary: Summary, token: datetime) -> bool:
        """Clear the claim only if `token` still owns it; False means it was taken over."""
        released = self._rowcount(
            update(Summary)
            .where(Summary.id == summary.id, Summary.generating_since == token)
            .values(generating_since=None)
            .execution_options(synchronize_session=False)
        )
        self.session.expire(summary, ["generating_since"])
        return released

    def delete_if_claimed(self, summary: Summary, token: datetime) -> bool:
        deleted = self._rowcount(
            delete(Summary)
            .where(Summary.id == summary.id, Summary.generating_since == token)
            .execution_options(synchronize_session=False)
        )
        if deleted:
            self.session.expunge(summary)
        return deleted

    def _rowcount(self, stmt: Executable) -> bool:
        result = cast(CursorResult[Any], self.session.execute(stmt))
        return result.rowcount == 1

    def replace_sections(self, summary_id: int, sections: Sequence[SummarySection]) -> None:
        self.session.execute(delete(SummarySection).where(SummarySection.summary_id == summary_id))
        self.session.add_all(sections)
        self.session.flush()

    def replace_keywords(self, meeting_id: int, keywords: Sequence[Keyword]) -> None:
        # Delete runs before the inserts, so re-adding an unchanged term cannot trip the
        # (meeting_id, term) unique constraint.
        self.session.execute(delete(Keyword).where(Keyword.meeting_id == meeting_id))
        self.session.add_all(keywords)
        self.session.flush()
