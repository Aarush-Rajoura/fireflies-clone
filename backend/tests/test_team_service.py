import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationFailedError
from app.models import Team, TeamMember, User
from app.models.enums import TeamMemberStatus, TeamRole
from app.services.teams import TeamService
from tests import factories as f
from tests.service_helpers import make_uow


def _service(db: Session) -> tuple[TeamService, User]:
    me = f.make_user(db, name="Sarah Chen")
    db.commit()
    return TeamService(make_uow(db)), me


def _token(invite_url: str | None) -> str:
    assert invite_url is not None and invite_url.startswith("/join/")
    return invite_url.removeprefix("/join/")


def test_no_team_until_one_is_created(db_session: Session) -> None:
    svc, me = _service(db_session)
    assert svc.get_my_team() is None
    with pytest.raises(NotFoundError) as err:
        svc.require_my_team()
    assert err.value.code == "NO_TEAM"

    team = svc.create_team("Acme")
    assert team.my_role == TeamRole.OWNER
    [owner] = team.members
    assert (owner.user_id, owner.role, owner.status) == (me.id, "owner", "active")
    assert owner.invite_url is None and owner.joined_at is not None
    assert svc.require_my_team().id == team.id


def test_one_team_per_user(db_session: Session) -> None:
    svc, _ = _service(db_session)
    svc.create_team("Acme")
    with pytest.raises(ConflictError) as err:
        svc.create_team("Other")
    assert err.value.code == "TEAM_EXISTS"


def test_invite_returns_links_and_reports_duplicates(db_session: Session) -> None:
    svc, me = _service(db_session)
    team = svc.create_team("Acme")
    first = svc.invite(team.id, ["Ana@Example.com", "bo@example.com", "ana@example.com"])
    assert [m.email for m in first.invited] == ["ana@example.com", "bo@example.com"]
    assert all(m.status == "invited" and m.role == "member" for m in first.invited)
    tokens = {_token(m.invite_url) for m in first.invited}
    assert len(tokens) == 2 and all(len(t) >= 32 for t in tokens)

    again = svc.invite(team.id, ["ANA@example.com", me.email, "cy@example.com"], TeamRole.ADMIN)
    assert [m.email for m in again.invited] == ["cy@example.com"]
    assert again.invited[0].role == "admin"
    assert [(s.email, s.reason) for s in again.skipped] == [
        ("ana@example.com", "already_invited"),
        (me.email, "already_member"),
    ]


def test_inviting_only_existing_people_is_409(db_session: Session) -> None:
    svc, _ = _service(db_session)
    team = svc.create_team("Acme")
    svc.invite(team.id, ["ana@example.com"])
    with pytest.raises(ConflictError) as err:
        svc.invite(team.id, ["Ana@example.com"])
    assert err.value.code == "MEMBER_EXISTS"
    assert err.value.details["skipped"] == [
        {"email": "ana@example.com", "reason": "already_invited"}
    ]


def test_invite_validation_for_direct_callers(db_session: Session) -> None:
    svc, _ = _service(db_session)
    team = svc.create_team("Acme")
    with pytest.raises(ValidationFailedError) as err:
        svc.invite(team.id, ["not-an-email"])
    assert err.value.code == "INVALID_EMAIL"
    with pytest.raises(ValidationFailedError):
        svc.invite(team.id, [])
    with pytest.raises(ValidationFailedError) as err:
        svc.invite(team.id, ["x@example.com"], TeamRole.OWNER)
    assert err.value.code == "INVITE_ROLE_INVALID"


def test_last_owner_cannot_be_demoted_or_removed(db_session: Session) -> None:
    svc, _ = _service(db_session)
    team = svc.create_team("Acme")
    owner_id = team.members[0].id
    with pytest.raises(ConflictError) as err:
        svc.change_role(owner_id, TeamRole.MEMBER)
    assert err.value.code == "LAST_OWNER"
    with pytest.raises(ConflictError) as err:
        svc.remove_member(owner_id)
    assert err.value.code == "LAST_OWNER"


def test_role_change_and_remove(db_session: Session) -> None:
    svc, _ = _service(db_session)
    team = svc.create_team("Acme")
    [ana] = svc.invite(team.id, ["ana@example.com"]).invited
    assert svc.change_role(ana.id, TeamRole.ADMIN).role == "admin"
    svc.remove_member(ana.id)
    assert [m.email for m in svc.require_my_team().members] == [team.members[0].email]
    with pytest.raises(NotFoundError) as err:
        svc.remove_member(ana.id)
    assert err.value.code == "MEMBER_NOT_FOUND"


def test_accept_links_matching_user_and_is_idempotent(db_session: Session) -> None:
    svc, _ = _service(db_session)
    teammate = f.make_user(db_session, name="Bo Diaz")
    db_session.commit()
    team = svc.create_team("Acme")
    [invite] = svc.invite(team.id, [teammate.email.upper()]).invited
    assert invite.display_name == "Bo Diaz" and invite.user_id is None

    accepted = svc.accept_invite(_token(invite.invite_url))
    assert accepted.status == "active" and accepted.user_id == teammate.id
    assert accepted.joined_at is not None and accepted.invite_url is None
    assert svc.accept_invite(_token(invite.invite_url)).id == accepted.id
    with pytest.raises(NotFoundError) as err:
        svc.accept_invite("nope")
    assert err.value.code == "INVITE_NOT_FOUND"


def test_accept_without_matching_user_still_activates(db_session: Session) -> None:
    svc, _ = _service(db_session)
    team = svc.create_team("Acme")
    [invite] = svc.invite(team.id, ["guest@example.com"]).invited
    accepted = svc.accept_invite(_token(invite.invite_url))
    assert accepted.status == "active" and accepted.user_id is None


def test_ownership_can_move_then_former_owner_loses_manage_rights(db_session: Session) -> None:
    svc, _ = _service(db_session)
    teammate = f.make_user(db_session, name="Bo Diaz")
    db_session.commit()
    team = svc.create_team("Acme")
    me_seat = team.members[0].id
    [bo] = svc.invite(team.id, [teammate.email]).invited
    svc.accept_invite(_token(bo.invite_url))
    svc.change_role(bo.id, TeamRole.OWNER)
    assert svc.change_role(me_seat, TeamRole.MEMBER).role == "member"
    assert svc.require_my_team().my_role == TeamRole.MEMBER

    with pytest.raises(ForbiddenError) as err:
        svc.invite(team.id, ["x@example.com"])
    assert err.value.code == "FORBIDDEN"
    with pytest.raises(ForbiddenError):
        svc.change_role(bo.id, TeamRole.MEMBER)
    with pytest.raises(ForbiddenError):
        svc.rename(team.id, "Mine now")


def test_admin_cannot_touch_owners(db_session: Session) -> None:
    svc, me = _service(db_session)
    team = svc.create_team("Acme")
    [ana] = svc.invite(team.id, ["ana@example.com"]).invited
    svc.accept_invite(_token(ana.invite_url))
    svc.change_role(ana.id, TeamRole.OWNER)
    svc.change_role(team.members[0].id, TeamRole.ADMIN)  # me: owner -> admin
    with pytest.raises(ForbiddenError):
        svc.change_role(ana.id, TeamRole.ADMIN)
    with pytest.raises(ForbiddenError):
        svc.remove_member(ana.id)
    with pytest.raises(ForbiddenError):
        svc.change_role(team.members[0].id, TeamRole.OWNER)
    assert me.id == team.members[0].user_id


def test_accepting_while_on_another_team_is_409(db_session: Session) -> None:
    svc, _ = _service(db_session)
    other = f.make_user(db_session, name="Bo Diaz")
    db_session.add(
        TeamMember(
            team_id=svc.create_team("Acme").id,
            user_id=other.id,
            email=other.email,
            role=TeamRole.MEMBER,
            status=TeamMemberStatus.ACTIVE,
            invite_token="t-bo",
        )
    )
    db_session.commit()
    # A second team (not the default user's) that also invited Bo.
    team2 = Team(name="Rival")
    db_session.add(team2)
    db_session.flush()
    db_session.add(
        TeamMember(
            team_id=team2.id,
            email=other.email,
            role=TeamRole.MEMBER,
            status=TeamMemberStatus.INVITED,
            invite_token="t-bo-2",
        )
    )
    db_session.commit()
    with pytest.raises(ConflictError) as err:
        svc.accept_invite("t-bo-2")
    assert err.value.code == "TEAM_EXISTS"


def test_database_enforces_one_team_per_user(db_session: Session) -> None:
    svc, me = _service(db_session)
    svc.create_team("Acme")
    other = Team(name="Other")
    db_session.add(other)
    db_session.flush()
    db_session.add(
        TeamMember(
            team_id=other.id,
            user_id=me.id,
            email="dup@example.com",
            role=TeamRole.MEMBER,
            status=TeamMemberStatus.ACTIVE,
            invite_token="dup-token",
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
