"""home dashboard: calendar connections, notifications, imported-meeting marker

Revision ID: 0004_home
Revises: 0002

meetings.calendar_provider is added with plain ALTER TABLE (no table rebuild) and has
no CHECK constraint, so the downgrade can drop it in place too; rebuilding `meetings`
in batch mode would lose its other CHECK constraints on SQLite.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_home"
down_revision: str | Sequence[str] | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _provider() -> sa.Enum:
    return sa.Enum("google", "outlook", name="calendarprovider", native_enum=False)


def upgrade() -> None:
    op.create_table(
        "calendar_connections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("provider", _provider(), nullable=False),
        sa.Column("connected_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "provider IN ('google', 'outlook')",
            name=op.f("ck_calendar_connections_provider_valid"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_calendar_connections_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_calendar_connections")),
        sa.UniqueConstraint("user_id", "provider", name="uq_calendar_connections_user_id_provider"),
    )
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "kind",
            sa.Enum(
                "meeting_created",
                "calendar_connected",
                "summary_regenerated",
                name="notificationkind",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("body", sa.Text(), server_default="", nullable=False),
        sa.Column("link", sa.String(length=500), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "kind IN ('meeting_created', 'calendar_connected', 'summary_regenerated')",
            name=op.f("ck_notifications_kind_valid"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_notifications_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_notifications")),
    )
    op.create_index(
        "ix_notifications_user_id_read_at", "notifications", ["user_id", "read_at"], unique=False
    )
    op.add_column("meetings", sa.Column("calendar_provider", _provider(), nullable=True))


def downgrade() -> None:
    op.execute("ALTER TABLE meetings DROP COLUMN calendar_provider")
    op.drop_index("ix_notifications_user_id_read_at", table_name="notifications")
    op.drop_table("notifications")
    op.drop_table("calendar_connections")
