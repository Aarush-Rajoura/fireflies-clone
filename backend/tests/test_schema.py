from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from sqlalchemy import Engine, select, text
from sqlalchemy.exc import IntegrityError, StatementError
from sqlalchemy.orm import Session

from app.models import (
    ActionItem,
    Channel,
    Comment,
    Highlight,
    Keyword,
    Meeting,
    MeetingTag,
    Participant,
    Soundbite,
    Speaker,
    Summary,
    SummarySection,
    Tag,
    TranscriptSegment,
    User,
)
from app.models.enums import ActionItemStatus, SectionKind


@pytest.fixture
def session(migrated_engine: Engine) -> Iterator[Session]:
    with Session(migrated_engine) as s:
        yield s


def _meeting(s: Session, title: str = "Standup") -> Meeting:
    host = User(name="Host", email=f"{title}@x.io")
    s.add(host)
    s.flush()
    m = Meeting(title=title, started_at=datetime(2026, 1, 1, 9, tzinfo=UTC), host_id=host.id)
    s.add(m)
    s.flush()
    return m


def _segment(
    s: Session, m: Meeting, seq: int = 1, start: int = 0, end: int = 10
) -> TranscriptSegment:
    sp = Speaker(meeting_id=m.id, label=f"S{seq}", color_index=0)
    s.add(sp)
    s.flush()
    seg = TranscriptSegment(
        meeting_id=m.id, speaker_id=sp.id, sequence=seq, start_ms=start, end_ms=end,
        text="we shipped the roadmap", original_text="we shipped the roadmap",
    )  # fmt: skip
    s.add(seg)
    s.flush()
    return seg


def _count(s: Session, table: str) -> int:
    return int(s.execute(text(f"SELECT count(*) FROM {table}")).scalar_one())


def test_meeting_delete_cascades_to_every_child(session: Session) -> None:
    m = _meeting(session)
    seg = _segment(session, m)
    p = Participant(meeting_id=m.id, display_name="Ann", role="attendee")
    summary = Summary(meeting_id=m.id, overview="o")
    tag = Tag(name="Sales", color_index=1)
    session.add_all([p, summary, tag])
    session.flush()
    session.add_all(
        [
            SummarySection(summary_id=summary.id, kind=SectionKind.OUTLINE, title="t", body="b",
                           sequence=1),
            Keyword(meeting_id=m.id, term="roadmap", weight=1.0),
            ActionItem(meeting_id=m.id, text="do", sequence=1),
            MeetingTag(meeting_id=m.id, tag_id=tag.id),
            Comment(meeting_id=m.id, segment_id=seg.id, body="c"),
            Highlight(meeting_id=m.id, segment_id=seg.id, start_offset=0, end_offset=3, color="y"),
            Soundbite(meeting_id=m.id, title="s", start_ms=0, end_ms=5),
        ]
    )  # fmt: skip
    session.commit()
    session.execute(text("DELETE FROM meetings WHERE id = :i"), {"i": m.id})
    session.commit()
    for table in (
        "participants", "speakers", "transcript_segments", "summaries", "summary_sections",
        "keywords", "action_items", "meeting_tags", "comments", "highlights", "soundbites",
    ):  # fmt: skip
        assert _count(session, table) == 0, table
    assert _count(session, "tags") == 1


def test_deleting_participant_nulls_action_item_assignee(session: Session) -> None:
    m = _meeting(session)
    p = Participant(meeting_id=m.id, display_name="Ann", role="attendee")
    session.add(p)
    session.flush()
    item = ActionItem(meeting_id=m.id, text="do", assignee_participant_id=p.id, sequence=1)
    session.add(item)
    session.commit()
    session.execute(text("DELETE FROM participants WHERE id = :i"), {"i": p.id})
    session.commit()
    session.refresh(item)
    assert item.assignee_participant_id is None
    assert item.status is ActionItemStatus.OPEN


def test_host_delete_is_restricted(session: Session) -> None:
    m = _meeting(session)
    session.commit()
    with pytest.raises(IntegrityError):
        session.execute(text("DELETE FROM users WHERE id = :i"), {"i": m.host_id})


def test_deleting_channel_sets_meeting_channel_null(session: Session) -> None:
    m = _meeting(session)
    ch = Channel(name="Hiring", slug="hiring")
    session.add(ch)
    session.flush()
    m.channel_id = ch.id
    session.commit()
    session.execute(text("DELETE FROM channels WHERE id = :i"), {"i": ch.id})
    session.commit()
    session.refresh(m)
    assert m.channel_id is None


def test_end_before_start_rejected(session: Session) -> None:
    m = _meeting(session)
    with pytest.raises(IntegrityError):
        _segment(session, m, start=100, end=50)


def test_duplicate_sequence_rejected(session: Session) -> None:
    m = _meeting(session)
    _segment(session, m, seq=1)
    with pytest.raises(IntegrityError):
        _segment(session, m, seq=1)


def test_tag_names_unique_case_insensitively(session: Session) -> None:
    session.add(Tag(name="Sales", color_index=0))
    session.flush()
    session.add(Tag(name="sales", color_index=1))
    with pytest.raises(IntegrityError):
        session.flush()


def test_negative_duration_rejected(session: Session) -> None:
    host = User(name="H", email="h@x.io")
    session.add(host)
    session.flush()
    session.add(Meeting(title="t", started_at=datetime.now(UTC), host_id=host.id, duration_ms=-1))
    with pytest.raises(IntegrityError):
        session.flush()


def test_invalid_enum_value_rejected(session: Session) -> None:
    m = _meeting(session)
    session.commit()
    with pytest.raises(IntegrityError):
        session.execute(text("UPDATE meetings SET status='bogus' WHERE id=:i"), {"i": m.id})


def test_highlight_offsets_must_be_ordered(session: Session) -> None:
    m = _meeting(session)
    seg = _segment(session, m)
    session.add(
        Highlight(meeting_id=m.id, segment_id=seg.id, start_offset=5, end_offset=5, color="y")
    )
    with pytest.raises(IntegrityError):
        session.flush()


def test_not_deleted_filter_excludes_soft_deleted(session: Session) -> None:
    live = _meeting(session, "live")
    gone = _meeting(session, "gone")
    gone.deleted_at = datetime.now(UTC)
    session.commit()
    ids = set(session.scalars(select(Meeting.id).where(Meeting.not_deleted())))
    assert live.id in ids
    assert gone.id not in ids


def test_meeting_defaults(session: Session) -> None:
    m = _meeting(session)
    session.commit()
    session.refresh(m)
    assert (m.language, m.auto_join, m.duration_ms) == ("en", False, 0)
    assert m.status.value == "completed"
    assert m.source.value == "manual"


def _fts(s: Session, term: str) -> list[int]:
    rows = s.execute(
        text("SELECT rowid FROM transcript_fts WHERE transcript_fts MATCH :t"), {"t": term}
    )
    return [r[0] for r in rows]


def test_fts_insert_update_delete_keep_index_in_sync(session: Session) -> None:
    m = _meeting(session)
    seg = _segment(session, m)
    session.commit()
    assert _fts(session, "roadmap") == [seg.id]
    assert _fts(session, "ship") == [seg.id]  # porter stemming: shipped -> ship
    seg.text = "budget review"
    session.commit()
    assert _fts(session, "roadmap") == []
    assert _fts(session, "budget") == [seg.id]
    session.delete(seg)
    session.commit()
    assert _fts(session, "budget") == []


def test_fts_backfill_covers_rows_present_at_migration(
    tmp_path, monkeypatch: pytest.MonkeyPatch
) -> None:  # type: ignore[no-untyped-def]
    from conftest import alembic_config

    from alembic import command
    from app.core.config import get_settings
    from app.db.session import make_engine

    url = f"sqlite:///{tmp_path / 'bf.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    engine = make_engine(url)
    try:
        command.upgrade(alembic_config(), "0001")  # schema without the FTS migration
        # Raw SQL, not the ORM: today's models have columns that 0001 does not.
        with engine.begin() as c:
            c.execute(text("INSERT INTO users (id, name, email) VALUES (1, 'Host', 'h@x.io')"))
            c.execute(
                text(
                    "INSERT INTO meetings (id, title, started_at, duration_ms, host_id, source,"
                    " status, media_type, language, auto_join, created_at, updated_at)"
                    " VALUES (1, 'Standup', '2026-01-01 09:00:00', 0, 1, 'manual', 'completed',"
                    " 'none', 'en', 0, '2026-01-01 09:00:00', '2026-01-01 09:00:00')"
                )
            )
            c.execute(text("INSERT INTO speakers (id, meeting_id, label) VALUES (1, 1, 'S1')"))
            c.execute(
                text(
                    "INSERT INTO transcript_segments (meeting_id, speaker_id, sequence, start_ms,"
                    " end_ms, text, original_text) VALUES (1, 1, 1, 0, 10,"
                    " 'we shipped the roadmap', 'we shipped the roadmap')"
                )
            )
        command.upgrade(alembic_config(), "head")
        with Session(engine) as s:
            assert len(_fts(s, "roadmap")) == 1
    finally:
        engine.dispose()
        get_settings.cache_clear()


def test_datetimes_round_trip_as_utc(session: Session) -> None:
    from datetime import timedelta, timezone

    ist = timezone(timedelta(hours=5, minutes=30))
    m = _meeting(session)
    sent = datetime(2026, 3, 1, 14, 30, tzinfo=ist)
    m.started_at = sent
    session.commit()
    session.expire_all()
    got = session.scalars(select(Meeting.started_at).where(Meeting.id == m.id)).one()
    assert got.tzinfo is not None
    assert got.utcoffset() == timedelta(0)
    assert got == sent
    assert got.hour == 9


def test_naive_datetime_is_rejected(session: Session) -> None:
    host = User(name="H", email="n@x.io")
    session.add(host)
    session.flush()
    session.add(Meeting(title="t", started_at=datetime(2026, 1, 1), host_id=host.id))
    with pytest.raises(StatementError, match="naive"):
        session.flush()


def test_fk_child_indexes_exist(migrated_engine: Engine) -> None:
    with migrated_engine.connect() as c:
        names = {r[0] for r in c.execute(text("SELECT name FROM sqlite_master WHERE type='index'"))}
    assert {
        "ix_meetings_host_id", "ix_participants_user_id", "ix_speakers_participant_id",
        "ix_channels_created_by", "ix_comments_author_id", "ix_highlights_created_by",
        "ix_soundbites_created_by",
    } <= names  # fmt: skip
