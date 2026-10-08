"""AskFred skills on the real seed data, with a fixed clock so every answer is deterministic."""

from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import Engine, select
from sqlalchemy.orm import Session

from app.ai.mock import MockProvider
from app.core.config import Settings
from app.db.session import make_session_factory
from app.db.unit_of_work import UnitOfWork
from app.models import Meeting, TranscriptSegment, User
from app.schemas.chat import ChatSkillId
from app.seed.seed import seed
from app.services.chat_skills import (
    ActionItemsThisWeekSkill,
    FreeQuestionSkill,
    PrepareUpcomingSkill,
    SkillReply,
    SkillRequest,
    SummarizeMeetingSkill,
    WeeklyDigestSkill,
    default_router,
)
from app.services.chat_skills.base import ChatSkill
from app.services.chat_skills.compose import ReplyBuilder, clip
from tests.ai_stubs import StubAnswerer

ANCHOR = datetime(2030, 1, 10, 12, 0, tzinfo=UTC)  # a Thursday
# Evening of the anchor day, so both of that day's meetings are over.
NOW = ANCHOR + timedelta(hours=6)

GO_NO_GO = "Lumora Insights 2.0 — Launch Go/No-Go"
HIRING = "Senior Backend Hiring Debrief — Candidate: Omar Haddad"
READINESS = "Insights 2.0 Launch Readiness Sync"


@pytest.fixture
def db(migrated_engine: Engine, tmp_path: Path) -> Session:
    session = make_session_factory(migrated_engine)()
    seed(session, Settings(media_dir=tmp_path / "media", seed_anchor_date=ANCHOR))
    return session


def _me(db: Session) -> int:
    return db.scalars(select(User.id).order_by(User.id)).first() or 0


def _meeting(db: Session, title: str) -> Meeting:
    return db.scalars(select(Meeting).where(Meeting.title == title)).one()


def _run(
    db: Session, skill: ChatSkill, question: str = "", meeting_id: int | None = None
) -> SkillReply:
    prepared = skill.prepare(UnitOfWork(db), SkillRequest(question, meeting_id, _me(db), NOW))
    db.rollback()
    return prepared.finish()


def _assert_citations_are_real(db: Session, reply: SkillReply) -> None:
    assert reply.sources, reply.content
    for source in reply.sources:
        meeting = db.get(Meeting, source.meeting_id)
        assert meeting is not None and meeting.title == source.meeting_title
        if source.segment_id is not None:
            segment = db.get(TranscriptSegment, source.segment_id)
            assert segment is not None and segment.meeting_id == source.meeting_id
            assert source.start_ms is not None and segment.start_ms <= source.start_ms
            assert source.quote == clip(segment.text)
    # Every [n] marker in the text has a source, and every source is referenced.
    for n in range(1, len(reply.sources) + 1):
        assert f"[{n}]" in reply.content
    assert f"[{len(reply.sources) + 1}]" not in reply.content


def test_action_items_this_week_lists_due_and_recent_open_items(db: Session) -> None:
    reply = _run(db, ActionItemsThisWeekSkill())
    text = reply.content
    assert text.startswith("## Your action items for this week (Mon, Jan 7 – Sun, Jan 13)")
    assert "### Due this week" in text and "### Also raised in the last 7 days" in text
    # Due on Fri Jan 11, from the hiring debrief.
    assert "Draft the offer letter" in text and "due Fri, Jan 11" in text
    # Assigned to the signed-in user, from the Brightpath kickoff.
    assert "Add Brightpath to the Insights 2.0 early-access list this week — **You**" in text
    # Open but neither due this week nor raised in the last 7 days.
    assert "customer concentration" not in text
    assert "launch webinar demo script" not in text
    # Completed items never appear.
    assert "thank-you email" not in text
    assert reply.provider is None
    _assert_citations_are_real(db, reply)
    assert all(s.segment_id is not None for s in reply.sources)


def test_summarize_defaults_to_the_latest_completed_meeting(db: Session) -> None:
    reply = _run(db, SummarizeMeetingSkill(), "Summarize my last meeting")
    assert reply.content.startswith(f"## {GO_NO_GO}")
    assert "conditional go" in reply.content
    assert "### Decision and rollback plan [" in reply.content
    assert "### Open action items" in reply.content
    assert {s.meeting_id for s in reply.sources} == {_meeting(db, GO_NO_GO).id}
    _assert_citations_are_real(db, reply)


def test_summarize_uses_the_mentioned_or_named_meeting(db: Session) -> None:
    hiring = _meeting(db, HIRING)
    mentioned = _run(db, SummarizeMeetingSkill(), "summarize", meeting_id=hiring.id)
    assert mentioned.content.startswith(f"## {HIRING}")
    named = _run(db, SummarizeMeetingSkill(), "Summarize the postmortem")
    assert named.content.startswith("## Postmortem — Analytics Ingestion Outage")
    upcoming = _run(db, SummarizeMeetingSkill(), "summarize", _meeting(db, READINESS).id)
    assert "hasn't happened yet" in upcoming.content and not upcoming.sources


def test_prepare_briefs_the_next_meeting_from_related_history(db: Session) -> None:
    reply = _run(db, PrepareUpcomingSkill(), "Prepare me for the upcoming meeting")
    text = reply.content
    assert text.startswith(f"## Prep: {READINESS}")
    assert "**When:** Fri, Jan 11 at 09:30 UTC" in text
    assert "Tobias Hartmann" in text and "Nadia Brennan" not in text.split("\n")[1]
    assert f"**{GO_NO_GO}**" in text
    assert "### Open action items to follow up" in text
    assert "per-tenant rate limits" in text
    assert "### Key points to revisit" in text and "### Suggested agenda" in text
    _assert_citations_are_real(db, reply)


def test_prepare_for_a_mentioned_upcoming_meeting(db: Session) -> None:
    checkin = _meeting(db, "Brightpath Health — Staging and Integration Check-in")
    reply = _run(db, PrepareUpcomingSkill(), "prep me", checkin.id)
    assert reply.content.startswith("## Prep: Brightpath Health — Staging")
    assert "**Brightpath Health — Onboarding Kickoff**" in reply.content


def test_weekly_digest_covers_the_last_seven_meetings(db: Session) -> None:
    reply = _run(db, WeeklyDigestSkill())
    text = reply.content
    past = db.scalars(select(Meeting.title).where(Meeting.status == "completed")).all()
    assert len(past) == 6
    assert "**6 meetings**" in text
    for title in past:
        assert f"**{title}**" in text
    assert "### Decisions" in text and "### Recurring themes" in text
    assert "### Open action items" in text
    _assert_citations_are_real(db, reply)


def test_free_question_answers_from_transcripts_with_the_mock(db: Session) -> None:
    reply = _run(db, FreeQuestionSkill(MockProvider()), "What about per-tenant rate limits?")
    assert reply.provider == "mock"
    _assert_free_citations(db, reply)
    hiring = _meeting(db, HIRING)
    scoped = _run(db, FreeQuestionSkill(MockProvider()), "salary offer equity", hiring.id)
    assert {s.meeting_id for s in scoped.sources} == {hiring.id}


def _assert_free_citations(db: Session, reply: SkillReply) -> None:
    assert reply.sources
    for s in reply.sources:
        segment = db.get(TranscriptSegment, s.segment_id)
        assert segment is not None and segment.meeting_id == s.meeting_id
        assert segment.start_ms == s.start_ms


def test_free_question_without_matches_does_not_call_the_ai(db: Session) -> None:
    stub = StubAnswerer()
    skill = FreeQuestionSkill(stub)
    prepared = skill.prepare(UnitOfWork(db), SkillRequest("zebra xylophone", None, _me(db), NOW))
    assert not prepared.uses_ai
    assert "couldn't find" in prepared.finish().content and stub.calls == []


@pytest.mark.parametrize(
    ("question", "skill", "expected", "rest"),
    [
        ("anything", ChatSkillId.DIGEST, ChatSkillId.DIGEST, "anything"),
        ("/digest", None, ChatSkillId.DIGEST, "Prepare weekly digest, based on my meetings"),
        ("/summarize the hiring debrief", None, ChatSkillId.SUMMARIZE, "the hiring debrief"),
        ("/ACTION-ITEMS", None, ChatSkillId.ACTION_ITEMS, None),
        ("/nope what is this", None, ChatSkillId.ASK, "/nope what is this"),
        ("List my action items & todos for this week", None, ChatSkillId.ACTION_ITEMS, None),
        ("Summarize my last meeting", None, ChatSkillId.SUMMARIZE, None),
        ("Prepare me for the upcoming meeting", None, ChatSkillId.PREPARE, None),
        ("Prepare weekly digest, based on my meetings", None, ChatSkillId.DIGEST, None),
        ("What did we decide about pricing?", None, ChatSkillId.ASK, None),
        ("Who owns the summary of the outage?", None, ChatSkillId.ASK, None),
    ],
)
def test_router_selects_skills(
    question: str, skill: ChatSkillId | None, expected: ChatSkillId, rest: str | None
) -> None:
    chosen, routed = default_router(MockProvider()).route(question, skill)
    assert chosen.id == expected
    if rest is not None:
        assert routed == rest


def test_reply_builder_numbers_each_moment_once(db: Session) -> None:
    meeting = _meeting(db, HIRING)
    reply = ReplyBuilder()
    first = reply.cite(meeting.id, meeting.title, 0, "a")
    again = reply.cite(meeting.id, meeting.title, 0, "b")
    other = reply.cite(meeting.id, meeting.title, None, "the meeting")
    assert (first, again, other) == ("[1]", "[1]", "[2]")
    built = reply.build(UnitOfWork(db))
    assert built.sources[0].segment_id is not None and built.sources[1].segment_id is None
    assert built.sources[1].quote == "the meeting"
