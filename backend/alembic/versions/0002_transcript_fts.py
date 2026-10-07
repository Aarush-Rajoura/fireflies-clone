"""transcript FTS5 index

Revision ID: 0002
Revises: 0001

An external-content FTS5 table over transcript_segments.text, kept in sync by
triggers. Search results join back to meetings via rowid -> segment -> meeting.

TRIGGER RULE: any later batch_alter_table("transcript_segments") recreates the
table, which silently drops the three triggers below. Such a migration must
re-create them at its end (copy the CREATE TRIGGER statements from here).
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002"
down_revision: str | Sequence[str] | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE VIRTUAL TABLE transcript_fts USING fts5(
            text,
            content='transcript_segments',
            content_rowid='id',
            tokenize='porter unicode61'
        )
        """
    )
    op.execute(
        """
        CREATE TRIGGER transcript_segments_ai AFTER INSERT ON transcript_segments BEGIN
            INSERT INTO transcript_fts(rowid, text) VALUES (new.id, new.text);
        END
        """
    )
    op.execute(
        """
        CREATE TRIGGER transcript_segments_ad AFTER DELETE ON transcript_segments BEGIN
            INSERT INTO transcript_fts(transcript_fts, rowid, text)
            VALUES ('delete', old.id, old.text);
        END
        """
    )
    # Only fires when text changes, so timing/speaker edits don't churn the index.
    op.execute(
        """
        CREATE TRIGGER transcript_segments_au AFTER UPDATE OF text ON transcript_segments BEGIN
            INSERT INTO transcript_fts(transcript_fts, rowid, text)
            VALUES ('delete', old.id, old.text);
            INSERT INTO transcript_fts(rowid, text) VALUES (new.id, new.text);
        END
        """
    )
    op.execute("INSERT INTO transcript_fts(transcript_fts) VALUES ('rebuild')")  # backfill


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS transcript_segments_au")
    op.execute("DROP TRIGGER IF EXISTS transcript_segments_ad")
    op.execute("DROP TRIGGER IF EXISTS transcript_segments_ai")
    op.execute("DROP TABLE IF EXISTS transcript_fts")
