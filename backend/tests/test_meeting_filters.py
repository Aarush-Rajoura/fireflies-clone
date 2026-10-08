from datetime import UTC, date, datetime

import pytest
from sqlalchemy.orm import Session

from app.models import Channel, Summary, Team, TeamMember
from app.models.enums import MeetingSource, MeetingStatus, TeamMemberStatus, TeamRole
from app.repositories.meetings import MeetingRepository
from app.schemas.common import PageParams
from app.schemas.meeting_filters import MeetingSort
from tests import factories as f
from tests.repo_helpers import at, run, titles


@pytest.fixture
def repo(db_session: Session) -> MeetingRepository:
    return MeetingRepository(db_session)


def test_default_sort_newest_first_and_pagination(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    for d in range(1, 6):
        f.make_meeting(db_session, host=host, title=f"m{d}", started_at=at(d))
    items, total = run(repo, page=PageParams(page=1, page_size=2))
    assert titles(items) == ["m5", "m4"] and total == 5
    items, total = run(repo, page=PageParams(page=3, page_size=2))
    assert titles(items) == ["m1"] and total == 5
    items, _ = run(repo, sort=MeetingSort.OLDEST)
    assert titles(items)[0] == "m1"
    items, _ = run(repo, sort=MeetingSort.TITLE)
    assert titles(items) == ["m1", "m2", "m3", "m4", "m5"]


def test_longest_sort(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    f.make_meeting(db_session, host=host, title="short", duration_ms=1)
    f.make_meeting(db_session, host=host, title="long", duration_ms=999)
    items, _ = run(repo, sort=MeetingSort.LONGEST)
    assert titles(items) == ["long", "short"]


def test_title_q_case_insensitive_and_escaped(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    f.make_meeting(db_session, host=host, title="Pricing Review")
    f.make_meeting(db_session, host=host, title="100% done")
    f.make_meeting(db_session, host=host, title="a_b")
    f.make_meeting(db_session, host=host, title="axb")
    assert titles(run(repo, q="pricing")[0]) == ["Pricing Review"]
    assert titles(run(repo, q="%")[0]) == ["100% done"]
    assert titles(run(repo, q="a_b")[0]) == ["a_b"]


def test_q_matches_participant_name(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    m = f.make_meeting(db_session, host=host, title="x")
    f.make_participant(db_session, m, "Priya Natarajan")
    f.make_meeting(db_session, host=host, title="y")
    items, total = run(repo, q="priya")
    assert titles(items) == ["x"] and total == 1


def test_participant_filter_no_duplicates(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    m = f.make_meeting(db_session, host=host, title="x")
    f.make_participant(db_session, m, "Sam One")
    f.make_participant(db_session, m, "Sam Two")
    f.make_meeting(db_session, host=host, title="y")
    items, total = run(repo, participant="sam")
    assert titles(items) == ["x"] and total == 1


def test_date_range_inclusive_edges(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    f.make_meeting(
        db_session,
        host=host,
        title="before",
        started_at=datetime(2026, 7, 9, 23, 59, 59, tzinfo=UTC),
    )
    f.make_meeting(
        db_session, host=host, title="first", started_at=datetime(2026, 7, 10, tzinfo=UTC)
    )
    f.make_meeting(
        db_session,
        host=host,
        title="last",
        started_at=datetime(2026, 7, 12, 23, 59, 59, tzinfo=UTC),
    )
    f.make_meeting(
        db_session, host=host, title="after", started_at=datetime(2026, 7, 13, tzinfo=UTC)
    )
    items, _ = run(
        repo, date_from=date(2026, 7, 10), date_to=date(2026, 7, 12), sort=MeetingSort.OLDEST
    )
    assert titles(items) == ["first", "last"]
    assert titles(run(repo, date_from=date(2026, 7, 13))[0]) == ["after"]
    assert len(run(repo, date_to=date(2026, 7, 9))[0]) == 1


def test_tag_filter_any_of(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    a, b = f.make_tag(db_session), f.make_tag(db_session)
    m1 = f.make_meeting(db_session, host=host, title="m1")
    m2 = f.make_meeting(db_session, host=host, title="m2")
    f.make_meeting(db_session, host=host, title="m3")
    f.tag_meeting(db_session, m1, a)
    f.tag_meeting(db_session, m1, b)
    f.tag_meeting(db_session, m2, b)
    items, total = run(repo, tag_ids=(a.id, b.id), sort=MeetingSort.TITLE)
    assert titles(items) == ["m1", "m2"] and total == 2
    assert titles(run(repo, tag_ids=(a.id,))[0]) == ["m1"]


def test_host_channel_and_combined(db_session: Session, repo: MeetingRepository):
    h1, h2 = f.make_user(db_session), f.make_user(db_session)
    f.make_meeting(db_session, host=h1, title="a", started_at=at(1))
    f.make_meeting(db_session, host=h2, title="b", started_at=at(2))
    assert titles(run(repo, host_id=h2.id)[0]) == ["b"]
    items, _ = run(repo, host_id=h1.id, q="a", date_from=date(2026, 7, 1), date_to=date(2026, 7, 1))
    assert titles(items) == ["a"]
    assert run(repo, host_id=h1.id, q="b")[1] == 0


def test_scope_and_status(db_session: Session, repo: MeetingRepository):
    me, other = f.make_user(db_session), f.make_user(db_session)
    f.make_meeting(db_session, host=me, title="hosted")
    shared = f.make_meeting(db_session, host=other, title="shared")
    f.make_participant(db_session, shared, "Me", user=me)
    f.make_meeting(db_session, host=other, title="other")
    f.make_meeting(db_session, host=me, title="up", source=MeetingSource.UPLOAD)
    f.make_meeting(db_session, host=other, title="paste", source=MeetingSource.PASTE)
    assert sorted(titles(run(repo, me.id, scope="hosted")[0])) == ["hosted", "up"]
    assert titles(run(repo, me.id, scope="shared")[0]) == ["shared"]
    assert sorted(titles(run(repo, me.id, scope="uploads")[0])) == ["paste", "up"]
    assert run(repo, me.id)[1] == 5


def test_upcoming_vs_completed(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    future = at(20)
    now = at(10)
    f.make_meeting(
        db_session, host=host, title="future", status=MeetingStatus.SCHEDULED, started_at=future
    )
    f.make_meeting(
        db_session, host=host, title="stale", status=MeetingStatus.SCHEDULED, started_at=at(1)
    )
    f.make_meeting(db_session, host=host, title="done")
    f.make_meeting(db_session, host=host, title="live", status=MeetingStatus.LIVE)
    f.make_meeting(db_session, host=host, title="proc", status=MeetingStatus.PROCESSING)
    assert titles(run(repo, status="upcoming", now=now)[0]) == ["future"]
    # The library holds finished meetings and live captures; a scheduled meeting whose
    # time passed is in neither list, and neither is one still processing.
    assert sorted(titles(run(repo, status="completed", now=now)[0])) == ["done", "live"]
    assert sorted(titles(run(repo, now=now)[0])) == ["done", "live"]


def test_q_matches_summary_overview(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    m = f.make_meeting(db_session, host=host, title="x")
    db_session.add(Summary(meeting_id=m.id, overview="We agreed on the Zanzibar rollout."))
    f.make_meeting(db_session, host=host, title="y")
    db_session.flush()
    assert titles(run(repo, q="zanzibar")[0]) == ["x"]


def test_q_matches_transcript_only_word(db_session: Session, repo: MeetingRepository):
    host = f.make_user(db_session)
    m = f.make_meeting(db_session, host=host, title="x")
    sp = f.make_speaker(db_session, m)
    f.make_segment(db_session, m, sp, "The quokka budget needs another look.")
    other = f.make_meeting(db_session, host=host, title="y")
    f.make_segment(db_session, other, f.make_speaker(db_session, other), "Nothing here.")
    assert titles(run(repo, q="quokka")[0]) == ["x"]
    assert titles(run(repo, q="quok")[0]) == ["x"]  # last word is a prefix
    assert titles(run(repo, q="quokka budget")[0]) == ["x"]
    assert run(repo, q="quokka unicorn")[1] == 0
    # FTS syntax in user input is treated as text, not operators.
    assert titles(run(repo, q='"quokka" OR*')[0]) == []


def test_channel_filter(db_session: Session, repo: MeetingRepository):
    ch = Channel(name="Sales", slug="sales")
    db_session.add(ch)
    db_session.flush()
    host = f.make_user(db_session)
    f.make_meeting(db_session, host=host, title="in", channel_id=ch.id)
    f.make_meeting(db_session, host=host, title="out")
    assert titles(run(repo, channel_id=ch.id)[0]) == ["in"]


def test_shared_scope_includes_meetings_hosted_by_teammates(
    db_session: Session, repo: MeetingRepository
):
    me, mate, pending, stranger = (f.make_user(db_session) for _ in range(4))
    team = Team(name="Acme")
    db_session.add(team)
    db_session.flush()
    for user, status in (
        (me, TeamMemberStatus.ACTIVE),
        (mate, TeamMemberStatus.ACTIVE),
        (pending, TeamMemberStatus.INVITED),
    ):
        db_session.add(
            TeamMember(
                team_id=team.id,
                user_id=user.id,
                email=user.email,
                role=TeamRole.MEMBER,
                status=status,
                invite_token=f"tok-{user.id}",
            )
        )
    f.make_meeting(db_session, host=mate, title="teammate")
    f.make_meeting(db_session, host=pending, title="not accepted")
    f.make_meeting(db_session, host=stranger, title="stranger")
    assert titles(run(repo, me.id, scope="shared")[0]) == ["teammate"]
