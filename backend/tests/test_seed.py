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
from app.seed import sample_audio
from app.seed.seed import ensure_media, longest_media_meeting_ms, main, refresh_upcoming, seed
from app.services.meeting_creation_mapping import color_index

ANCHOR = datetime(2030, 1, 10, 12, 0, tzinfo=UTC)


@pytest.fixture
def media_dir(tmp_path: Path) -> Path:
    return tmp_path / "media"


@pytest.fixture
def seeded(migrated_engine: Engine, media_dir: Path) -> Session:
    session = make_session_factory(migrated_engine)()
    seed(session, Settings(media_dir=media_dir, seed_anchor_date=ANCHOR))
    return session


def _counts(session: Session) -> tuple[int, ...]:
    return tuple(
        session.scalar(select(func.count()).select_from(model)) or 0
        for model in (Meeting, TranscriptSegment, Summary, ActionItem, User)
    )


def _past(session: Session) -> list[Meeting]:
    stmt = select(Meeting).where(Meeting.status == MeetingStatus.COMPLETED)
    return list(session.scalars(stmt))


def test_second_run_adds_nothing(seeded: Session, media_dir: Path) -> None:
    before = _counts(seeded)
    result = seed(seeded, Settings(media_dir=media_dir))
    assert result.meetings_added == 0
    assert _counts(seeded) == before


def test_if_empty_is_a_no_op_when_seeded(seeded: Session, media_dir: Path) -> None:
    assert seed(seeded, Settings(media_dir=media_dir), if_empty=True).skipped


def test_reset_rebuilds_the_same_data(seeded: Session, media_dir: Path) -> None:
    before = _counts(seeded)
    seed(seeded, Settings(media_dir=media_dir), do_reset=True)
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


def test_anchor_date_shifts_everything(migrated_engine: Engine, media_dir: Path) -> None:
    session = make_session_factory(migrated_engine)()
    seed(session, Settings(media_dir=media_dir, seed_anchor_date=ANCHOR))
    newest = session.scalar(select(func.max(Meeting.started_at)))
    assert newest is not None and newest.date() - ANCHOR.date() <= timedelta(days=7)
    assert newest.year == 2030


def test_default_user_and_media(seeded: Session, media_dir: Path) -> None:
    me = seeded.scalars(select(User).order_by(User.id)).first()
    assert me is not None and me.onboarded_at == ANCHOR and me.job_title
    with_media = seeded.scalars(select(Meeting).where(Meeting.media_type == MediaType.AUDIO)).all()
    assert len(with_media) == 2
    assert (media_dir / "sample-meeting.wav").is_file()
    assert all(m.media_url == "media/sample-meeting.wav" for m in with_media)


def test_speaker_colours_match_meeting_creation(seeded: Session) -> None:
    speakers = seeded.scalars(select(Speaker)).all()
    assert speakers and all(s.color_index == color_index(s.label) for s in speakers)


def test_seeded_data_is_visible_through_the_api(seeded: Session, media_dir: Path) -> None:
    app = create_app(Settings(database_url=str(seeded.get_bind().engine.url), media_dir=media_dir))
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
    migrated_engine: Engine, capsys: pytest.CaptureFixture[str], media_dir: Path
) -> None:
    session = make_session_factory(migrated_engine)()
    seed(session, Settings(media_dir=media_dir, seed_anchor_date=ANCHOR))
    before = _counts(session)
    assert main(["--reset"]) == 1
    assert "--yes" in capsys.readouterr().err
    assert _counts(session) == before


def test_sample_audio_covers_the_longest_media_meeting(seeded: Session, media_dir: Path) -> None:
    longest = max(
        m.duration_ms for m in seeded.scalars(select(Meeting).where(Meeting.media_url.is_not(None)))
    )
    assert longest == longest_media_meeting_ms() and longest > 60_000
    assert sample_audio.duration_ms(media_dir / sample_audio.SAMPLE_FILENAME) >= longest + 5_000


def test_short_sample_audio_is_replaced(media_dir: Path) -> None:
    path = media_dir / sample_audio.SAMPLE_FILENAME
    sample_audio.write_sample(path, 1_000)
    assert sample_audio.duration_ms(path) < 60_000
    ensure_media(media_dir)
    assert sample_audio.duration_ms(path) >= longest_media_meeting_ms() + 5_000
    before = path.stat().st_mtime_ns
    ensure_media(media_dir)
    assert path.stat().st_mtime_ns == before  # long enough: left alone


def test_if_empty_still_generates_audio(seeded: Session, media_dir: Path) -> None:
    (media_dir / sample_audio.SAMPLE_FILENAME).unlink()
    assert seed(seeded, Settings(media_dir=media_dir), if_empty=True).skipped
    assert (media_dir / sample_audio.SAMPLE_FILENAME).is_file()


def test_refresh_upcoming_moves_only_past_scheduled_seed_meetings(seeded: Session) -> None:
    upcoming = seeded.scalars(
        select(Meeting).where(Meeting.status == MeetingStatus.SCHEDULED).order_by(Meeting.title)
    ).all()
    completed_before = {m.id: m.started_at for m in _past(seeded)}
    later = ANCHOR + timedelta(days=30)  # both upcoming meetings are now in the past
    assert refresh_upcoming(seeded, now=later) == 2
    for m in upcoming:
        seeded.refresh(m)
        assert m.started_at > later
    offsets = sorted((m.started_at.date() - later.date()).days for m in upcoming)
    assert offsets == [1, 6]
    assert {m.id: m.started_at for m in _past(seeded)} == completed_before
    assert refresh_upcoming(seeded, now=later) == 0  # idempotent


def test_seeded_media_seeks_past_the_first_minute(seeded: Session, media_dir: Path) -> None:
    mid = seeded.scalars(select(Meeting.id).where(Meeting.media_url.is_not(None))).first()
    url = str(seeded.get_bind().engine.url)
    app = create_app(Settings(database_url=url, media_dir=media_dir))
    offset = sample_audio.SAMPLE_RATE * 70  # 8-bit mono: one byte per sample
    with TestClient(app) as client:
        r = client.get(f"/api/v1/meetings/{mid}/media", headers={"Range": f"bytes={offset}-"})
    assert r.status_code == 206 and len(r.content) > 0
