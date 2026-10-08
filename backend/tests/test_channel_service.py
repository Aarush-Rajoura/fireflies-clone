import pytest
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationFailedError
from app.schemas.channel import ChannelCreate, ChannelUpdate
from app.schemas.common import PageParams
from app.schemas.meeting import MeetingUpdate
from app.services.channels import ChannelService
from app.services.meetings import MeetingService
from tests import factories as f
from tests.service_helpers import seeded


def test_create_list_rename(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    svc = ChannelService(uow)
    ch = svc.create(ChannelCreate(name="  Product Team! "))
    assert ch.slug == "product-team"
    assert svc.list(PageParams()).total == 1
    assert svc.rename(ch.id, ChannelUpdate(name="Growth")).slug == "growth"


def test_duplicate_is_409_and_unsluggable_is_422(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    svc = ChannelService(uow)
    svc.create(ChannelCreate(name="Eng"))
    with pytest.raises(ConflictError) as err:
        svc.create(ChannelCreate(name="eng"))
    assert err.value.code == "CHANNEL_EXISTS"
    other = svc.create(ChannelCreate(name="Ops"))
    with pytest.raises(ConflictError):
        svc.rename(other.id, ChannelUpdate(name="ENG"))
    with pytest.raises(ValidationFailedError):
        svc.create(ChannelCreate(name="!!!"))


def test_delete_keeps_meetings(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    svc = ChannelService(uow)
    ch = svc.create(ChannelCreate(name="Eng"))
    MeetingService(uow).update(m.id, MeetingUpdate(channel_id=ch.id))
    assert svc.list(PageParams()).items[0].meeting_count == 1
    svc.delete(ch.id)
    db_session.refresh(m)
    assert m.channel_id is None and m.deleted_at is None
    with pytest.raises(NotFoundError) as err:
        svc.delete(ch.id)
    assert err.value.code == "CHANNEL_NOT_FOUND"


def test_moving_a_meeting_to_an_unknown_channel_is_422(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    with pytest.raises(ValidationFailedError):
        MeetingService(uow).update(m.id, MeetingUpdate(channel_id=55))
    f.make_user(db_session)


def test_unique_index_race_on_create_is_channel_exists(
    db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    uow, _, _ = seeded(db_session)
    svc = ChannelService(uow)
    svc.create(ChannelCreate(name="Eng"))
    # A concurrent create passed the pre-check: only the unique index can catch it.
    monkeypatch.setattr(uow.channels, "get_by_slug", lambda slug: None)
    with pytest.raises(ConflictError) as err:
        svc.create(ChannelCreate(name="eng"))
    assert err.value.code == "CHANNEL_EXISTS"
    assert svc.list(PageParams()).total == 1  # rolled back cleanly
