"""teams and team members

Revision ID: 0008_team
Revises: 0007_chat

One team per user (enforced in TeamService). Invites are rows with status
'invited' and a random token; no email is ever sent.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0008_team"
down_revision: str | Sequence[str] | None = "0007_chat"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "teams",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
            name=op.f("fk_teams_created_by_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_teams")),
    )
    op.create_index("ix_teams_created_by", "teams", ["created_by"])
    op.create_table(
        "team_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("display_name", sa.String(length=200), nullable=True),
        sa.Column(
            "role",
            sa.Enum("owner", "admin", "member", name="teamrole", native_enum=False),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("invited", "active", name="teammemberstatus", native_enum=False),
            nullable=False,
        ),
        sa.Column("invite_token", sa.String(length=64), nullable=False),
        sa.Column("invited_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "role IN ('owner', 'admin', 'member')", name=op.f("ck_team_members_role_valid")
        ),
        sa.CheckConstraint(
            "status IN ('invited', 'active')", name=op.f("ck_team_members_status_valid")
        ),
        sa.ForeignKeyConstraint(
            ["team_id"],
            ["teams.id"],
            name=op.f("fk_team_members_team_id_teams"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_team_members_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_team_members")),
        sa.UniqueConstraint("invite_token", name=op.f("uq_team_members_invite_token")),
    )
    # Unique: the DB itself enforces one team per user (NULLs, i.e. pending invites, may repeat).
    op.create_index("uq_team_members_user_id", "team_members", ["user_id"], unique=True)
    # Expression index: autogenerate cannot detect it, so it is written by hand.
    op.create_index(
        "uq_team_members_team_email_lower",
        "team_members",
        ["team_id", sa.text("lower(email)")],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_team_members_team_email_lower", table_name="team_members")
    op.drop_index("uq_team_members_user_id", table_name="team_members")
    op.drop_table("team_members")
    op.drop_index("ix_teams_created_by", table_name="teams")
    op.drop_table("teams")
