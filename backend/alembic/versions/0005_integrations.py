"""integration connections

Revision ID: 0005_integrations
Revises: 0004_home

The integration catalogue is static data in code; only which entries a user
has connected is stored.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005_integrations"
down_revision: str | Sequence[str] | None = "0004_home"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "integration_connections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("integration_key", sa.String(length=64), nullable=False),
        sa.Column("connected_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_integration_connections_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_integration_connections")),
        sa.UniqueConstraint(
            "user_id", "integration_key", name=op.f("uq_integration_connections_user_id")
        ),
    )


def downgrade() -> None:
    op.drop_table("integration_connections")
