"""tasks: standalone action items with user assignees

Revision ID: 0006_tasks
Revises: 0005_integrations

Action items can now exist without a meeting (tasks created on the Tasks page),
be assigned to a user directly, and remember who created them.

The batch rebuild touches only action_items; the FTS triggers live on
transcript_segments, so nothing needs re-creating here.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006_tasks"
down_revision: str | Sequence[str] | None = "0005_integrations"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("action_items", schema=None) as batch_op:
        batch_op.alter_column("meeting_id", existing_type=sa.Integer(), nullable=True)
        batch_op.add_column(sa.Column("assignee_user_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("created_by_user_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            batch_op.f("fk_action_items_assignee_user_id_users"),
            "users",
            ["assignee_user_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_foreign_key(
            batch_op.f("fk_action_items_created_by_user_id_users"),
            "users",
            ["created_by_user_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index("ix_action_items_assignee_user_id", ["assignee_user_id"])
        batch_op.create_index("ix_action_items_created_by_user_id", ["created_by_user_id"])


def downgrade() -> None:
    # The old schema cannot hold a task without a meeting, so those rows go.
    op.execute("DELETE FROM action_items WHERE meeting_id IS NULL")
    with op.batch_alter_table("action_items", schema=None) as batch_op:
        batch_op.drop_index("ix_action_items_created_by_user_id")
        batch_op.drop_index("ix_action_items_assignee_user_id")
        batch_op.drop_constraint(
            batch_op.f("fk_action_items_created_by_user_id_users"), type_="foreignkey"
        )
        batch_op.drop_constraint(
            batch_op.f("fk_action_items_assignee_user_id_users"), type_="foreignkey"
        )
        batch_op.drop_column("created_by_user_id")
        batch_op.drop_column("assignee_user_id")
        batch_op.alter_column("meeting_id", existing_type=sa.Integer(), nullable=False)
