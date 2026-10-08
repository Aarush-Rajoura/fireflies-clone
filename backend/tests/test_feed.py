"""The AI feed is derived from stored rows; it never calls the AI."""

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Keyword, Meeting, Summary, User
from app.models.enums import ActionItemStatus, MeetingStatus
from app.schemas.common import PageParams
from app.services.feed import FeedService, first_sentence
from tests import factories as f
from tests.service_helpers import seeded

NOW = datetime(2026, 10, 8, 12, 0, tzinfo=UTC)


def _summary(db: Session, meeting: Meeting, overview: str, at: datetime) -> None:
    db.add(Summary(meeting_id=meeting.id, overview=overview, generated_at=at))
    db.flush()


def _keywords(db: Session, meeting: Meeting, *terms: str) -> None:
    db.add_all(Keyword(meeting_id=meeting.id, term=t) for t in terms)
    db.flush()


def _meeting(db: Session, host: User, title: str, days_ago: float, **kw: object) -> Meeting:
    return f.make_meeting(
        db,
        host=host,
        title=title,
        started_at=NOW - timedelta(days=days_ago),
        **kw,  # type: ignore[arg-type]
    )


def test_first_sentence() -> None:
    assert first_sentence("  We agreed to ship. Then lunch!") == "We agreed to ship."
    assert first_sentence("No full stop") == "No full stop"
    assert first_sentence("Version 2.1 ships. Next") == "Version 2.1 ships."


def test_feed_derives_summaries_action_items_and_trends(db_session: Session) -> None:
    uow, user, base = seeded(db_session)
    a = _meeting(db_session, user, "Pricing sync", 1)
    b = _meeting(db_session, user, "Roadmap", 2)
    old = _meeting(db_session, user, "Ancient", 30)
    deleted = _meeting(db_session, user, "Deleted", 1, deleted_at=NOW)
    scheduled = _meeting(db_session, user, "Later", -1, status=MeetingStatus.SCHEDULED)

    _summary(db_session, a, "Pricing moves to tiers. Bob objected.", NOW - timedelta(hours=1))
    _summary(db_session, b, "Roadmap locked.", NOW - timedelta(hours=5))
    _summary(db_session, base, "", NOW)  # empty overview: nothing to say
    _summary(db_session, deleted, "Should not appear.", NOW)

    _keywords(db_session, a, "Pricing", "tiers")
    _keywords(db_session, b, "pricing", "roadmap")
    _keywords(db_session, old, "pricing", "tiers")  # outside the 7-day window
    _keywords(db_session, deleted, "tiers")
    _keywords(db_session, scheduled, "tiers")

    me = f.make_participant(db_session, a, user.name, user=user)
    other = f.make_participant(db_session, a, "Bob")
    mine = f.make_action_item(db_session, a, text="Draft the tier table")
    mine.assignee_participant_id = me.id
    done = f.make_action_item(db_session, a, text="Done already", status=ActionItemStatus.COMPLETED)
    done.assignee_participant_id = me.id
    theirs = f.make_action_item(db_session, a, text="Bob's task")
    theirs.assignee_participant_id = other.id
    db_session.commit()

    page = FeedService(uow).page(PageParams(), now=NOW)
    by_kind: dict[str, list[tuple[str, str, int | None]]] = {}
    for item in page.items:
        by_kind.setdefault(item.kind, []).append((item.title, item.body, item.meeting_id))

    assert by_kind["summary"] == [
        ("Pricing sync", "Pricing moves to tiers.", a.id),
        ("Roadmap", "Roadmap locked.", b.id),
    ]
    assert by_kind["action_item"] == [
        ("Action item from Pricing sync", "Draft the tier table", a.id)
    ]
    # Only "pricing" was raised by 2+ finished, live meetings this week.
    assert by_kind["trending"] == [
        ("Trending in your meetings this week", "Pricing (2 meetings)", None)
    ]
    created = [i.created_at for i in page.items]
    assert created == sorted(created, reverse=True)
    assert page.total == 4


def test_feed_paginates_and_is_empty_without_data(db_session: Session) -> None:
    uow, user, _ = seeded(db_session)
    assert FeedService(uow).page(PageParams(), now=NOW).total == 0
    for i in range(3):
        m = _meeting(db_session, user, f"M{i}", i)
        _summary(db_session, m, f"Overview {i}.", NOW - timedelta(hours=i))
    db_session.commit()
    second = FeedService(uow).page(PageParams(page=2, page_size=2), now=NOW)
    assert [i.title for i in second.items] == ["M2"]
    assert second.total == 3 and not second.has_next


def test_feed_endpoint_returns_page_envelope(api: TestClient) -> None:
    body = api.get("/api/v1/feed").json()
    assert set(body) == {"items", "page", "page_size", "total", "total_pages", "has_next"}
    assert body["items"] == []
