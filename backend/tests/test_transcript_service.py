from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from app.core.exceptions import GoneError, NotFoundError
from app.models import Summary
from app.models.enums import MediaType
from app.schemas.common import PageParams
from app.schemas.transcript import SegmentUpdate
from app.services.media import MediaService
from app.services.search import SearchService
from app.services.transcript import TranscriptService
from app.services.transcript_text import build_transcript_for_ai
from app.services.users import UserService
from tests import factories as f
from tests.service_helpers import seeded


def _with_segments(db: Session):  # type: ignore[no-untyped-def]
    uow, user, m = seeded(db)
    a = f.make_speaker(db, m, "Speaker 1")
    b = f.make_speaker(db, m, "Speaker 2")
    s2 = f.make_segment(db, m, b, "second line", sequence=1)
    s1 = f.make_segment(db, m, a, "first line", sequence=0)
    db.commit()
    return uow, m, a, b, s1, s2


def test_get_orders_by_sequence(db_session: Session) -> None:
    uow, m, a, _, s1, s2 = _with_segments(db_session)
    t = TranscriptService(uow).get(m.id)
    assert [s.id for s in t.segments] == [s1.id, s2.id]
    assert [sp.label for sp in t.speakers] == ["Speaker 1", "Speaker 2"]


def test_get_unknown_and_deleted(db_session: Session) -> None:
    uow, m, *_ = _with_segments(db_session)
    with pytest.raises(NotFoundError):
        TranscriptService(uow).get(999)
    uow.meetings.soft_delete(m)
    with pytest.raises(GoneError):
        TranscriptService(uow).get(m.id)


def test_edit_keeps_original_and_marks_stale(db_session: Session) -> None:
    uow, m, _, _, s1, _ = _with_segments(db_session)
    db_session.add(Summary(meeting_id=m.id, overview="o"))
    db_session.commit()
    svc = TranscriptService(uow)
    out = svc.update_segment(s1.id, SegmentUpdate(text="  edited "))
    assert out.text == "edited" and out.original_text == "first line" and out.is_edited
    again = svc.update_segment(s1.id, SegmentUpdate(text="twice"))
    assert again.original_text == "first line"
    assert db_session.query(Summary).one().is_stale is True


def test_edit_without_summary_and_missing_segment(db_session: Session) -> None:
    uow, _, _, _, s1, _ = _with_segments(db_session)
    TranscriptService(uow).update_segment(s1.id, SegmentUpdate(text="x"))
    with pytest.raises(NotFoundError) as err:
        TranscriptService(uow).update_segment(12345, SegmentUpdate(text="x"))
    assert err.value.code == "SEGMENT_NOT_FOUND"


def test_edit_on_deleted_meeting_is_gone(db_session: Session) -> None:
    uow, m, _, _, s1, _ = _with_segments(db_session)
    uow.meetings.soft_delete(m)
    with pytest.raises(GoneError):
        TranscriptService(uow).update_segment(s1.id, SegmentUpdate(text="x"))


def test_rename_speaker_creates_then_renames_participant(db_session: Session) -> None:
    uow, m, a, _, _, _ = _with_segments(db_session)
    svc = TranscriptService(uow)
    out = svc.rename_speaker(a.id, "Ann")
    assert out.name == "Ann" and out.label == "Speaker 1" and out.participant_id is not None
    pid = out.participant_id
    again = svc.rename_speaker(a.id, "Anna")
    assert again.participant_id == pid and again.name == "Anna"
    assert [p.display_name for p in uow.participants.list_for_meeting(m.id)] == ["Anna"]


def test_rename_speaker_links_existing_participant(db_session: Session) -> None:
    uow, m, a, _, _, _ = _with_segments(db_session)
    bob = f.make_participant(db_session, m, "Bob")
    db_session.commit()
    out = TranscriptService(uow).rename_speaker(a.id, "bob")
    assert out.participant_id == bob.id and out.name == "Bob"


def test_repointing_a_speaker_moves_talk_time(db_session: Session) -> None:
    uow, m, a, b, _, _ = _with_segments(db_session)  # each segment lasts 900 ms
    svc = TranscriptService(uow)
    ann = svc.rename_speaker(a.id, "Ann").participant_id
    bob = svc.rename_speaker(b.id, "Bob").participant_id
    talk = {p.display_name: p.talk_ms for p in uow.participants.list_for_meeting(m.id)}
    assert talk == {"Ann": 900, "Bob": 900}
    # Speaker 2 turns out to be Ann too: Bob loses the time, Ann gains it.
    assert svc.rename_speaker(b.id, "ann").participant_id == ann != bob
    talk = {p.display_name: p.talk_ms for p in uow.participants.list_for_meeting(m.id)}
    assert talk == {"Ann": 1800, "Bob": 0}


def test_rename_unknown_speaker(db_session: Session) -> None:
    uow, *_ = _with_segments(db_session)
    with pytest.raises(NotFoundError) as err:
        TranscriptService(uow).rename_speaker(999, "x")
    assert err.value.code == "SPEAKER_NOT_FOUND"


def test_build_transcript_for_ai(db_session: Session) -> None:
    uow, m, a, b, s1, s2 = _with_segments(db_session)
    TranscriptService(uow).rename_speaker(a.id, "Ann")
    t = build_transcript_for_ai(
        m,
        uow.transcript.segments(m.id),
        uow.transcript.speakers(m.id),
        uow.participants.list_for_meeting(m.id),
    )
    assert t.meeting_title == m.title
    assert [(ln.segment_id, ln.speaker) for ln in t.lines] == [
        (s1.id, "Ann"),
        (s2.id, "Speaker 2"),
    ]


def test_media_without_media_is_404(db_session: Session, tmp_path: Path) -> None:
    uow, _, m = seeded(db_session)
    with pytest.raises(NotFoundError) as err:
        MediaService(uow, tmp_path).resolve(m.id)
    assert err.value.code == "MEDIA_NOT_FOUND"


def test_media_resolves_inside_dir(db_session: Session, tmp_path: Path) -> None:
    uow, _, m = seeded(db_session)
    (tmp_path / "a.mp3").write_bytes(b"x")
    m.media_url = "/media/a.mp3"
    m.media_type = MediaType.AUDIO
    db_session.commit()
    mf = MediaService(uow, tmp_path).resolve(m.id)
    assert mf.path == (tmp_path / "a.mp3").resolve() and mf.media_type == "audio/mpeg"


@pytest.mark.parametrize("url", ["../../etc/passwd", "/etc/passwd", "media/../../x", "missing.mp3"])
def test_media_never_escapes_media_dir(db_session: Session, tmp_path: Path, url: str) -> None:
    uow, _, m = seeded(db_session)
    media = tmp_path / "media"
    media.mkdir()
    (tmp_path / "x").write_bytes(b"secret")
    m.media_url = url
    m.media_type = MediaType.AUDIO
    db_session.commit()
    with pytest.raises(NotFoundError) as err:
        MediaService(uow, media).resolve(m.id)
    assert err.value.code == "MEDIA_NOT_FOUND"


def test_user_list_envelope(db_session: Session) -> None:
    uow, user, _ = seeded(db_session)
    f.make_user(db_session, name="Zed")
    db_session.commit()
    page = UserService(uow).list(PageParams(page_size=1))
    assert page.total == 2 and len(page.items) == 1 and page.has_next
    assert page.items[0].email == user.email


def test_search(db_session: Session) -> None:
    uow, m, *_ = _with_segments(db_session)
    live = SearchService(uow).search("first", PageParams())
    assert live.total == 1
    hit = live.items[0]
    assert hit.meeting_id == m.id and hit.speaker == "Speaker 1"
    assert hit.snippet[hit.ranges[0].start : hit.ranges[0].end].lower() == "first"
    uow.meetings.soft_delete(m)
    assert SearchService(uow).search("first", PageParams()).total == 0


def test_rename_speaker_case_only(db_session: Session) -> None:
    uow, _, a, *_ = _with_segments(db_session)
    svc = TranscriptService(uow)
    svc.rename_speaker(a.id, "ann")
    assert svc.rename_speaker(a.id, "Ann").name == "Ann"
