from datetime import UTC, date, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import make_session_factory
from app.main import create_app
from app.models import (
    ActionItem,
    Meeting,
    Speaker,
    Summary,
    SummarySection,
    TranscriptSegment,
    User,
)
from app.models.enums import MediaType, MeetingStatus, SectionKind
from app.seed.seed import main, seed
from app.services.meeting_creation_mapping import color_index

MEDIA_DIR = Path(__file__).resolve().parents[1] / "media"
ANCHOR = datetime(2030, 1, 10, 12, 0, tzinfo=UTC)


@pytest.fixture
def seeded(migrated_engine: Engine) -> Session:
    session = make_session_factory(migrated_engine)()
    seed(session, Settings(media_dir=MEDIA_DIR, seed_anchor_date=ANCHOR))
    return session


def _counts(session: Session) -> tuple[int, ...]:
    return tuple(
        session.scalar(select(func.count()).select_from(model)) or 0
        for model in (Meeting, TranscriptSegment, Summary, ActionItem, User)
    )


def _past(session: Session) -> list[Meeting]:
    stmt = select(Meeting).where(Meeting.status == MeetingStatus.COMPLETED)
    return list(session.scalars(stmt))


def test_second_run_adds_nothing(seeded: Session) -> None:
    before = _counts(seeded)
    result = seed(seeded, Settings(media_dir=MEDIA_DIR))
    assert result.meetings_added == 0
    assert _counts(seeded) == before


def test_if_empty_is_a_no_op_when_seeded(seeded: Session) -> None:
    assert seed(seeded, Settings(media_dir=MEDIA_DIR), if_empty=True).skipped


def test_reset_rebuilds_the_same_data(seeded: Session) -> None:
    before = _counts(seeded)
    seed(seeded, Settings(media_dir=MEDIA_DIR), do_reset=True)
    assert _counts(seeded) == before


def test_every_past_meeting_is_complete(seeded: Session) -> None:
    meetings = _past(seeded)
    assert len(meetings) == 6
    for m in meetings:
        segs = seeded.scalars(
            select(TranscriptSegment).where(TranscriptSegment.meeting_id == m.id)
        ).all()
        items = seeded.scalars(select(ActionItem).where(ActionItem.meeting_id == m.id)).all()
        summary = seeded.scalar(select(Summary).where(Summary.meeting_id == m.id))
        assert segs and m.duration_ms == segs[-1].end_ms
        assert len(items) >= 3
        assert summary is not None and summary.provider == "seed" and not summary.is_stale


def test_outline_lands_on_segment_starts(seeded: Session) -> None:
    starts = set(seeded.scalars(select(TranscriptSegment.start_ms)))
    outline = seeded.scalars(
        select(SummarySection.start_ms).where(SummarySection.kind == SectionKind.OUTLINE)
    ).all()
    assert outline and set(outline) <= starts


def test_dates_are_spread_around_today(seeded: Session) -> None:
    days = {(m.started_at.date() - ANCHOR.date()).days for m in _past(seeded)}
    assert 0 in days and -1 in days and any(d < -7 for d in days)
    upcoming = seeded.scalars(
        select(Meeting).where(Meeting.status == MeetingStatus.SCHEDULED)
    ).all()
    assert len(upcoming) == 2
    assert all(m.started_at > ANCHOR and m.meeting_url and m.platform for m in upcoming)
    assert all(
        seeded.scalar(select(func.count()).where(TranscriptSegment.meeting_id == m.id)) == 0
        for m in upcoming
    )


def test_anchor_date_shifts_everything(migrated_engine: Engine) -> None:
    session = make_session_factory(migrated_engine)()
    seed(session, Settings(media_dir=MEDIA_DIR, seed_anchor_date=ANCHOR))
    newest = session.scalar(select(func.max(Meeting.started_at)))
    assert newest is not None and newest.date() - ANCHOR.date() <= timedelta(days=7)
    assert newest.year == 2030


def test_default_user_and_media(seeded: Session) -> None:
    me = seeded.scalars(select(User).order_by(User.id)).first()
    assert me is not None and me.onboarded_at == ANCHOR and me.job_title
    with_media = seeded.scalars(select(Meeting).where(Meeting.media_type == MediaType.AUDIO)).all()
    assert len(with_media) == 2
    assert (MEDIA_DIR / "sample-meeting.wav").is_file()
    assert all(m.media_url == "media/sample-meeting.wav" for m in with_media)


def test_speaker_colours_match_meeting_creation(seeded: Session) -> None:
    speakers = seeded.scalars(select(Speaker)).all()
    assert speakers and all(s.color_index == color_index(s.label) for s in speakers)


def test_seeded_data_is_visible_through_the_api(seeded: Session) -> None:
    app = create_app(Settings(database_url=str(seeded.get_bind().engine.url), media_dir=MEDIA_DIR))
    with TestClient(app) as client:
        done = client.get("/api/v1/meetings", params={"page_size": 100}).json()
        assert done["total"] == 6
        assert client.get("/api/v1/meetings", params={"status": "upcoming"}).json()["total"] == 2
        assert client.get("/api/v1/me").status_code == 200


def test_due_dates_are_relative_to_the_meeting_day(seeded: Session) -> None:
    oldest = seeded.scalars(select(Meeting).order_by(Meeting.started_at).limit(1)).one()
    assert (oldest.started_at.date() - ANCHOR.date()).days == -35
    dues = seeded.scalars(
        select(ActionItem.due_date).where(ActionItem.meeting_id == oldest.id)
    ).all()
    dated = [d for d in dues if d is not None]
    assert dated
    assert all(isinstance(d, date) and d < ANCHOR.date() for d in dated)
    assert all(d >= oldest.started_at.date() for d in dated)


def test_reset_without_yes_refuses(
    migrated_engine: Engine, capsys: pytest.CaptureFixture[str]
) -> None:
    session = make_session_factory(migrated_engine)()
    seed(session, Settings(media_dir=MEDIA_DIR, seed_anchor_date=ANCHOR))
    before = _counts(session)
    assert main(["--reset"]) == 1
    assert "--yes" in capsys.readouterr().err
    assert _counts(session) == before
