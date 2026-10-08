from datetime import UTC, date, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.exceptions import ValidationFailedError
from app.models import Keyword, Meeting, Participant, User
from app.models.enums import ActionItemStatus, MeetingSource, MeetingStatus
from app.schemas.analytics import AnalyticsOverview, AnalyticsRange
from app.services.analytics import AnalyticsService
from tests import factories as f
from tests.service_helpers import make_uow

NOW = datetime(2026, 10, 8, 12, 0, tzinfo=UTC)  # a Thursday
MIN = 60_000


def _person(db: Session, m: Meeting, name: str, talk_ms: int, user: User | None = None) -> None:
    db.add(
        Participant(
            meeting_id=m.id, display_name=name, user_id=user.id if user else None, talk_ms=talk_ms
        )
    )


def _keyword(db: Session, m: Meeting, term: str, weight: float) -> None:
    db.add(Keyword(meeting_id=m.id, term=term, weight=weight))


@pytest.fixture
def svc(db_session: Session) -> AnalyticsService:
    """Six meetings spread so each range sees a different slice.

    - Oct 6 10:00 upload, 30 min   → 7d, 30d, 90d, all
    - Oct 1 09:00 paste, 60 min    → 30d, 90d, all (just outside 7d)
    - Aug 1 15:00 seed, no talk    → 90d, all
    - Jan 15 08:00 calendar        → all
    - Oct 7 deleted, Oct 7 scheduled → never
    """
    db = db_session
    sarah, other = f.make_user(db), f.make_user(db, name="Raj")
    m1 = f.make_meeting(
        db, host=sarah, started_at=datetime(2026, 10, 6, 10, 0, tzinfo=UTC),
        duration_ms=30 * MIN, source=MeetingSource.UPLOAD,
    )  # fmt: skip
    m2 = f.make_meeting(
        db, host=sarah, started_at=datetime(2026, 10, 1, 9, 0, tzinfo=UTC),
        duration_ms=60 * MIN, source=MeetingSource.PASTE,
    )  # fmt: skip
    f.make_meeting(
        db, host=sarah, started_at=datetime(2026, 8, 1, 15, 0, tzinfo=UTC),
        source=MeetingSource.SEED,
    )  # fmt: skip
    f.make_meeting(
        db, host=other, started_at=datetime(2026, 1, 15, 8, 0, tzinfo=UTC),
        duration_ms=15 * MIN, source=MeetingSource.CALENDAR,
    )  # fmt: skip
    gone = f.make_meeting(
        db, host=sarah, started_at=datetime(2026, 10, 7, 9, 0, tzinfo=UTC),
        duration_ms=99 * MIN, deleted_at=NOW,
    )  # fmt: skip
    later = f.make_meeting(
        db, host=sarah, started_at=datetime(2026, 10, 7, 9, 0, tzinfo=UTC),
        status=MeetingStatus.SCHEDULED,
    )  # fmt: skip

    _person(db, m1, "Sarah Chen", 10 * MIN, sarah)
    _person(db, m1, "Bob", 5 * MIN)
    # A renamed linked user and a differently-cased guest are still one person each.
    _person(db, m2, "Sarah C.", 20 * MIN, sarah)
    _person(db, m2, "bob", 1 * MIN + 40_000)
    _person(db, gone, "Ghost", 50 * MIN)
    _person(db, later, "Future", 50 * MIN)

    _keyword(db, m1, "Pricing", 0.9)
    _keyword(db, m1, "Hiring", 0.5)
    _keyword(db, m2, "pricing", 0.4)
    _keyword(db, m2, "Roadmap", 1.0)
    _keyword(db, gone, "Ghosts", 9.0)

    f.make_action_item(db, m1, status=ActionItemStatus.COMPLETED)
    f.make_action_item(db, m1)
    f.make_action_item(db, m2)
    f.make_action_item(db, gone, status=ActionItemStatus.COMPLETED)
    db.commit()
    return AnalyticsService(make_uow(db))


def _overview(svc: AnalyticsService, r: str, tz: str = "UTC") -> AnalyticsOverview:
    return svc.overview(AnalyticsRange(r), tz, now=NOW)


def test_last_30_days_aggregates(svc: AnalyticsService) -> None:
    o = _overview(svc, "30d")
    t = o.totals
    assert (t.meetings, t.total_duration_ms, t.avg_duration_ms) == (2, 90 * MIN, 45 * MIN)
    assert t.unique_participants == 2
    assert (t.action_items_created, t.action_items_completed) == (3, 1)
    assert t.completion_rate == pytest.approx(1 / 3)

    assert [(w.week_start, w.meetings) for w in o.meetings_per_week] == [
        (date(2026, 9, 7), 0),
        (date(2026, 9, 14), 0),
        (date(2026, 9, 21), 0),
        (date(2026, 9, 28), 1),
        (date(2026, 10, 5), 1),
    ]

    assert o.talk_time.total_ms == 36 * MIN + 40_000
    assert [(p.name, p.talk_ms) for p in o.talk_time.participants] == [
        ("Sarah Chen", 30 * MIN),  # the account name, not the per-meeting "Sarah C."
        ("Bob", 6 * MIN + 40_000),
    ]
    assert o.talk_time.participants[0].share == pytest.approx(30 / (36 + 2 / 3))

    assert [(k.term, k.meetings, k.weight) for k in o.top_keywords] == [
        ("Pricing", 2, 1.3),
        ("Roadmap", 1, 1.0),
        ("Hiring", 1, 0.5),
    ]

    assert o.activity.heatmap[1][10] == 1  # Tuesday 10:00
    assert o.activity.heatmap[3][9] == 1  # Thursday 09:00
    assert sum(map(sum, o.activity.heatmap)) == 2
    assert (o.activity.busiest_weekday, o.activity.busiest_hour) == (1, 9)  # ties → earliest

    counts = {s.source: s.meetings for s in o.sources}
    assert counts == {s: 0 for s in MeetingSource} | {
        MeetingSource.UPLOAD: 1,
        MeetingSource.PASTE: 1,
    }


def test_each_range_widens_the_window(svc: AnalyticsService) -> None:
    week = _overview(svc, "7d")
    assert (week.totals.meetings, week.totals.action_items_created) == (1, 2)
    assert week.totals.completion_rate == 0.5
    assert [w.meetings for w in week.meetings_per_week] == [0, 1]
    assert [k.term for k in week.top_keywords] == ["Pricing", "Hiring"]
    assert week.start == datetime(2026, 10, 1, 12, 0, tzinfo=UTC)

    assert _overview(svc, "90d").totals.meetings == 3

    everything = _overview(svc, "all")
    assert everything.start is None
    assert everything.totals.meetings == 4
    assert everything.totals.total_duration_ms == 105 * MIN
    buckets = everything.meetings_per_week
    assert buckets[0].week_start == date(2026, 1, 12)
    assert buckets[-1].week_start == date(2026, 10, 5)
    assert len(buckets) == 39 and sum(b.meetings for b in buckets) == 4


def test_empty_range_is_zeros_not_errors(db_session: Session) -> None:
    f.make_meeting(db_session, started_at=datetime(2025, 1, 1, tzinfo=UTC))
    db_session.commit()
    o = AnalyticsService(make_uow(db_session)).overview(AnalyticsRange.WEEK, now=NOW)
    assert o.totals.model_dump() == {
        "meetings": 0,
        "total_duration_ms": 0,
        "avg_duration_ms": 0,
        "unique_participants": 0,
        "action_items_created": 0,
        "action_items_completed": 0,
        "completion_rate": 0.0,
    }
    assert [w.meetings for w in o.meetings_per_week] == [0, 0]
    assert o.talk_time.total_ms == 0 and o.talk_time.participants == []
    assert o.top_keywords == []
    assert sum(map(sum, o.activity.heatmap)) == 0
    assert o.activity.busiest_weekday is None and o.activity.busiest_hour is None
    assert all(s.meetings == 0 for s in o.sources)


def test_all_time_on_an_empty_database_has_one_zero_week(db_session: Session) -> None:
    o = AnalyticsService(make_uow(db_session)).overview(AnalyticsRange.ALL, now=NOW)
    assert [(w.week_start, w.meetings) for w in o.meetings_per_week] == [(date(2026, 10, 5), 0)]


def test_weeks_and_hours_are_bucketed_in_the_local_zone(db_session: Session) -> None:
    # 23:30Z on Sunday Oct 4 is already 05:00 on Monday Oct 5 in India (UTC+5:30).
    f.make_meeting(db_session, started_at=datetime(2026, 10, 4, 23, 30, tzinfo=UTC))
    db_session.commit()
    svc = AnalyticsService(make_uow(db_session))

    utc = svc.overview(AnalyticsRange.WEEK, "UTC", now=NOW)
    assert [(w.week_start, w.meetings) for w in utc.meetings_per_week] == [
        (date(2026, 9, 28), 1),
        (date(2026, 10, 5), 0),
    ]
    assert utc.activity.heatmap[6][23] == 1
    assert utc.activity.busiest_weekday == 6

    india = svc.overview(AnalyticsRange.WEEK, "Asia/Kolkata", now=NOW)
    assert [(w.week_start, w.meetings) for w in india.meetings_per_week] == [
        (date(2026, 9, 28), 0),
        (date(2026, 10, 5), 1),
    ]
    assert india.activity.heatmap[0][5] == 1
    assert (india.activity.busiest_weekday, india.activity.busiest_hour) == (0, 5)


def test_talk_time_keeps_top_eight_and_folds_the_rest(db_session: Session) -> None:
    m = f.make_meeting(db_session, started_at=datetime(2026, 10, 7, tzinfo=UTC))
    for i in range(10):
        _person(db_session, m, f"P{i}", (10 - i) * MIN)  # P0 talks most
    db_session.commit()
    talk = AnalyticsService(make_uow(db_session)).overview(AnalyticsRange.WEEK, now=NOW).talk_time
    names = [p.name for p in talk.participants]
    assert names == [f"P{i}" for i in range(8)] + ["Others"]
    others = talk.participants[-1]
    assert others.is_other and others.talk_ms == 3 * MIN  # P8 (2 min) + P9 (1 min)
    assert talk.total_ms == 55 * MIN
    assert sum(p.share for p in talk.participants) == pytest.approx(1.0)


def test_unknown_timezone_is_rejected(db_session: Session) -> None:
    with pytest.raises(ValidationFailedError) as err:
        AnalyticsService(make_uow(db_session)).overview(AnalyticsRange.ALL, "Mars/Olympus")
    assert err.value.code == "INVALID_TIMEZONE"


def test_overview_endpoint(api: TestClient) -> None:
    api.post("/api/v1/meetings", json={"title": "Sync", "started_at": "2026-01-05T10:00:00Z"})
    body = api.get("/api/v1/analytics/overview", params={"range": "all", "tz": "Asia/Kolkata"})
    assert body.status_code == 200
    data = body.json()
    assert (data["range"], data["tz"], data["totals"]["meetings"]) == ("all", "Asia/Kolkata", 1)
    assert len(data["activity"]["heatmap"]) == 7

    assert api.get("/api/v1/analytics/overview").json()["range"] == "30d"
    bad_tz = api.get("/api/v1/analytics/overview", params={"tz": "Nowhere/City"})
    assert bad_tz.status_code == 422 and bad_tz.json()["error"]["code"] == "INVALID_TIMEZONE"
    bad_range = api.get("/api/v1/analytics/overview", params={"range": "1y"})
    assert bad_range.status_code == 422 and bad_range.json()["error"]["code"] == "VALIDATION_ERROR"
