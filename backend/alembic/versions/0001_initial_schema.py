"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-10-07 23:00:59.443164

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("color_index", sa.Integer(), server_default="0", nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tags")),
    )
    # Expression index: autogenerate cannot detect it, so it is written by hand.
    op.create_index("uq_tags_name_lower", "tags", [sa.text("lower(name)")], unique=True)
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("role", sa.String(length=100), nullable=True),
        sa.Column("job_title", sa.String(length=150), nullable=True),
        sa.Column(
            "join_preference",
            sa.Enum("owned", "all", "team", "invited", name="joinpreference", native_enum=False),
            nullable=True,
        ),
        sa.Column(
            "recap_preference",
            sa.Enum("me", "everyone", "team", name="recappreference", native_enum=False),
            nullable=True,
        ),
        sa.Column("onboarded_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "join_preference IN ('owned', 'all', 'team', 'invited')",
            name=op.f("ck_users_join_preference_valid"),
        ),
        sa.CheckConstraint(
            "recap_preference IN ('me', 'everyone', 'team')",
            name=op.f("ck_users_recap_preference_valid"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )
    op.create_table(
        "channels",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("is_private", sa.Boolean(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
            name=op.f("fk_channels_created_by_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_channels")),
        sa.UniqueConstraint("slug", name=op.f("uq_channels_slug")),
    )
    op.create_table(
        "meetings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_ms", sa.Integer(), server_default="0", nullable=False),
        sa.Column("host_id", sa.Integer(), nullable=False),
        sa.Column("channel_id", sa.Integer(), nullable=True),
        sa.Column(
            "source",
            sa.Enum(
                "seed",
                "upload",
                "paste",
                "manual",
                "capture",
                "calendar",
                name="meetingsource",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "scheduled",
                "live",
                "processing",
                "completed",
                name="meetingstatus",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("media_url", sa.String(length=500), nullable=True),
        sa.Column(
            "media_type",
            sa.Enum("audio", "video", "none", name="mediatype", native_enum=False),
            nullable=False,
        ),
        sa.Column("meeting_url", sa.String(length=500), nullable=True),
        sa.Column(
            "platform",
            sa.Enum("zoom", "meet", "teams", "other", name="platform", native_enum=False),
            nullable=True,
        ),
        sa.Column("language", sa.String(length=16), server_default="en", nullable=False),
        sa.Column("auto_join", sa.Boolean(), server_default=sa.text("0"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "media_type IN ('audio', 'video', 'none')", name=op.f("ck_meetings_media_type_valid")
        ),
        sa.CheckConstraint(
            "platform IN ('zoom', 'meet', 'teams', 'other')",
            name=op.f("ck_meetings_platform_valid"),
        ),
        sa.CheckConstraint(
            "source IN ('seed', 'upload', 'paste', 'manual', 'capture', 'calendar')",
            name=op.f("ck_meetings_source_valid"),
        ),
        sa.CheckConstraint(
            "status IN ('scheduled', 'live', 'processing', 'completed')",
            name=op.f("ck_meetings_status_valid"),
        ),
        sa.CheckConstraint("duration_ms >= 0", name=op.f("ck_meetings_duration_non_negative")),
        sa.ForeignKeyConstraint(
            ["channel_id"],
            ["channels.id"],
            name=op.f("fk_meetings_channel_id_channels"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["host_id"], ["users.id"], name=op.f("fk_meetings_host_id_users"), ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_meetings")),
    )
    with op.batch_alter_table("meetings", schema=None) as batch_op:
        batch_op.create_index("ix_meetings_channel_id", ["channel_id"], unique=False)
        batch_op.create_index("ix_meetings_deleted_at", ["deleted_at"], unique=False)
        batch_op.create_index("ix_meetings_started_at", ["started_at"], unique=False)
        batch_op.create_index(
            "ix_meetings_status_started_at", ["status", "started_at"], unique=False
        )

    op.create_table(
        "keywords",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("term", sa.String(length=100), nullable=False),
        sa.Column("weight", sa.Double(), server_default="1.0", nullable=False),
        sa.ForeignKeyConstraint(
            ["meeting_id"],
            ["meetings.id"],
            name=op.f("fk_keywords_meeting_id_meetings"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_keywords")),
        sa.UniqueConstraint("meeting_id", "term", name="uq_keywords_meeting_id_term"),
    )
    op.create_table(
        "meeting_tags",
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["meeting_id"],
            ["meetings.id"],
            name=op.f("fk_meeting_tags_meeting_id_meetings"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tag_id"], ["tags.id"], name=op.f("fk_meeting_tags_tag_id_tags"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("meeting_id", "tag_id", name=op.f("pk_meeting_tags")),
    )
    with op.batch_alter_table("meeting_tags", schema=None) as batch_op:
        batch_op.create_index("ix_meeting_tags_tag_id", ["tag_id"], unique=False)

    op.create_table(
        "participants",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("display_name", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column(
            "role",
            sa.Enum("host", "attendee", name="participantrole", native_enum=False),
            nullable=False,
        ),
        sa.Column("talk_ms", sa.Integer(), server_default="0", nullable=False),
        sa.CheckConstraint("role IN ('host', 'attendee')", name=op.f("ck_participants_role_valid")),
        sa.ForeignKeyConstraint(
            ["meeting_id"],
            ["meetings.id"],
            name=op.f("fk_participants_meeting_id_meetings"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_participants_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_participants")),
        sa.UniqueConstraint(
            "meeting_id", "display_name", name="uq_participants_meeting_id_display_name"
        ),
    )
    op.create_table(
        "soundbites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("start_ms", sa.Integer(), nullable=False),
        sa.Column("end_ms", sa.Integer(), nullable=False),
        sa.CheckConstraint("end_ms > start_ms", name=op.f("ck_soundbites_time_range")),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
            name=op.f("fk_soundbites_created_by_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["meeting_id"],
            ["meetings.id"],
            name=op.f("fk_soundbites_meeting_id_meetings"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_soundbites")),
    )
    with op.batch_alter_table("soundbites", schema=None) as batch_op:
        batch_op.create_index("ix_soundbites_meeting_id", ["meeting_id"], unique=False)

    op.create_table(
        "summaries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("overview", sa.Text(), server_default="", nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=True),
        sa.Column("model", sa.String(length=100), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_stale", sa.Boolean(), server_default=sa.text("0"), nullable=False),
        sa.Column("generating_since", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["meeting_id"],
            ["meetings.id"],
            name=op.f("fk_summaries_meeting_id_meetings"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_summaries")),
        sa.UniqueConstraint("meeting_id", name=op.f("uq_summaries_meeting_id")),
    )
    op.create_table(
        "action_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("assignee_participant_id", sa.Integer(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("open", "completed", name="actionitemstatus", native_enum=False),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "source",
            sa.Enum("ai", "manual", name="actionitemsource", native_enum=False),
            nullable=False,
        ),
        sa.Column("start_ms", sa.Integer(), nullable=True),
        sa.Column("sequence", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("source IN ('ai', 'manual')", name=op.f("ck_action_items_source_valid")),
        sa.CheckConstraint(
            "status IN ('open', 'completed')", name=op.f("ck_action_items_status_valid")
        ),
        sa.ForeignKeyConstraint(
            ["assignee_participant_id"],
            ["participants.id"],
            name=op.f("fk_action_items_assignee_participant_id_participants"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["meeting_id"],
            ["meetings.id"],
            name=op.f("fk_action_items_meeting_id_meetings"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_action_items")),
    )
    with op.batch_alter_table("action_items", schema=None) as batch_op:
        batch_op.create_index(
            "ix_action_items_assignee_participant_id", ["assignee_participant_id"], unique=False
        )
        batch_op.create_index(
            "ix_action_items_meeting_id_status", ["meeting_id", "status"], unique=False
        )

    op.create_table(
        "speakers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=100), nullable=False),
        sa.Column("participant_id", sa.Integer(), nullable=True),
        sa.Column("color_index", sa.Integer(), server_default="0", nullable=False),
        sa.CheckConstraint(
            "color_index BETWEEN 0 AND 7", name=op.f("ck_speakers_color_index_range")
        ),
        sa.ForeignKeyConstraint(
            ["meeting_id"],
            ["meetings.id"],
            name=op.f("fk_speakers_meeting_id_meetings"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["participant_id"],
            ["participants.id"],
            name=op.f("fk_speakers_participant_id_participants"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_speakers")),
        sa.UniqueConstraint("meeting_id", "label", name="uq_speakers_meeting_id_label"),
    )
    op.create_table(
        "summary_sections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("summary_id", sa.Integer(), nullable=False),
        sa.Column(
            "kind",
            sa.Enum("outline", "notes", name="sectionkind", native_enum=False),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("body", sa.Text(), server_default="", nullable=False),
        sa.Column("start_ms", sa.Integer(), nullable=True),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "kind IN ('outline', 'notes')", name=op.f("ck_summary_sections_kind_valid")
        ),
        sa.ForeignKeyConstraint(
            ["summary_id"],
            ["summaries.id"],
            name=op.f("fk_summary_sections_summary_id_summaries"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_summary_sections")),
    )
    with op.batch_alter_table("summary_sections", schema=None) as batch_op:
        batch_op.create_index(
            "ix_summary_sections_summary_id_kind_sequence",
            ["summary_id", "kind", "sequence"],
            unique=False,
        )

    op.create_table(
        "transcript_segments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("speaker_id", sa.Integer(), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("start_ms", sa.Integer(), nullable=False),
        sa.Column("end_ms", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("original_text", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "start_ms >= 0 AND end_ms >= start_ms", name=op.f("ck_transcript_segments_time_range")
        ),
        sa.ForeignKeyConstraint(
            ["meeting_id"],
            ["meetings.id"],
            name=op.f("fk_transcript_segments_meeting_id_meetings"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["speaker_id"],
            ["speakers.id"],
            name=op.f("fk_transcript_segments_speaker_id_speakers"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_transcript_segments")),
        sa.UniqueConstraint(
            "meeting_id", "sequence", name="uq_transcript_segments_meeting_id_sequence"
        ),
    )
    with op.batch_alter_table("transcript_segments", schema=None) as batch_op:
        batch_op.create_index(
            "ix_transcript_segments_meeting_id_start_ms", ["meeting_id", "start_ms"], unique=False
        )
        batch_op.create_index("ix_transcript_segments_speaker_id", ["speaker_id"], unique=False)

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("segment_id", sa.Integer(), nullable=True),
        sa.Column("author_id", sa.Integer(), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["author_id"],
            ["users.id"],
            name=op.f("fk_comments_author_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["meeting_id"],
            ["meetings.id"],
            name=op.f("fk_comments_meeting_id_meetings"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["segment_id"],
            ["transcript_segments.id"],
            name=op.f("fk_comments_segment_id_transcript_segments"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_comments")),
    )
    with op.batch_alter_table("comments", schema=None) as batch_op:
        batch_op.create_index("ix_comments_meeting_id", ["meeting_id"], unique=False)
        batch_op.create_index("ix_comments_segment_id", ["segment_id"], unique=False)

    op.create_table(
        "highlights",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("segment_id", sa.Integer(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("start_offset", sa.Integer(), nullable=False),
        sa.Column("end_offset", sa.Integer(), nullable=False),
        sa.Column("color", sa.String(length=32), nullable=False),
        sa.CheckConstraint(
            "start_offset >= 0 AND start_offset < end_offset",
            name=op.f("ck_highlights_offset_range"),
        ),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
            name=op.f("fk_highlights_created_by_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["meeting_id"],
            ["meetings.id"],
            name=op.f("fk_highlights_meeting_id_meetings"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["segment_id"],
            ["transcript_segments.id"],
            name=op.f("fk_highlights_segment_id_transcript_segments"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_highlights")),
    )
    with op.batch_alter_table("highlights", schema=None) as batch_op:
        batch_op.create_index("ix_highlights_meeting_id", ["meeting_id"], unique=False)
        batch_op.create_index("ix_highlights_segment_id", ["segment_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("highlights", schema=None) as batch_op:
        batch_op.drop_index("ix_highlights_segment_id")
        batch_op.drop_index("ix_highlights_meeting_id")

    op.drop_table("highlights")
    with op.batch_alter_table("comments", schema=None) as batch_op:
        batch_op.drop_index("ix_comments_segment_id")
        batch_op.drop_index("ix_comments_meeting_id")

    op.drop_table("comments")
    with op.batch_alter_table("transcript_segments", schema=None) as batch_op:
        batch_op.drop_index("ix_transcript_segments_speaker_id")
        batch_op.drop_index("ix_transcript_segments_meeting_id_start_ms")

    op.drop_table("transcript_segments")
    with op.batch_alter_table("summary_sections", schema=None) as batch_op:
        batch_op.drop_index("ix_summary_sections_summary_id_kind_sequence")

    op.drop_table("summary_sections")
    op.drop_table("speakers")
    with op.batch_alter_table("action_items", schema=None) as batch_op:
        batch_op.drop_index("ix_action_items_meeting_id_status")
        batch_op.drop_index("ix_action_items_assignee_participant_id")

    op.drop_table("action_items")
    op.drop_table("summaries")
    with op.batch_alter_table("soundbites", schema=None) as batch_op:
        batch_op.drop_index("ix_soundbites_meeting_id")

    op.drop_table("soundbites")
    op.drop_table("participants")
    with op.batch_alter_table("meeting_tags", schema=None) as batch_op:
        batch_op.drop_index("ix_meeting_tags_tag_id")

    op.drop_table("meeting_tags")
    op.drop_table("keywords")
    with op.batch_alter_table("meetings", schema=None) as batch_op:
        batch_op.drop_index("ix_meetings_status_started_at")
        batch_op.drop_index("ix_meetings_started_at")
        batch_op.drop_index("ix_meetings_deleted_at")
        batch_op.drop_index("ix_meetings_channel_id")

    op.drop_table("meetings")
    op.drop_table("channels")
    op.drop_table("users")
    op.drop_index("uq_tags_name_lower", table_name="tags")
    op.drop_table("tags")
