import pytest
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationFailedError
from app.schemas.channel import ChannelCreate, ChannelUpdate
from app.schemas.common import PageParams
from app.services.channels import ChannelService
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
    svc.move_meeting(m.id, ch.id)
    assert svc.list(PageParams()).items[0].meeting_count == 1
    svc.delete(ch.id)
    db_session.refresh(m)
    assert m.channel_id is None and m.deleted_at is None
    with pytest.raises(NotFoundError) as err:
        svc.delete(ch.id)
    assert err.value.code == "CHANNEL_NOT_FOUND"


def test_move_meeting_unknown_channel(db_session: Session) -> None:
    uow, _, m = seeded(db_session)
    with pytest.raises(ValidationFailedError):
        ChannelService(uow).move_meeting(m.id, 55)
    f.make_user(db_session)
