"""create sessions table

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-04

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "sessions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("project_root", sa.String(length=1024), nullable=False),
        # Informational only — the daemon is never the authority on session
        # identity/boundaries. See docs/adr/0005-session-engine.md.
        sa.Column("daemon_session_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="ACTIVE"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_event_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("event_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "events_by_type",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "languages",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "files",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("git_branch", sa.String(length=255), nullable=True),
        sa.Column("summary", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    # Primary lookup: "is there an open session for this project?"
    op.create_index(
        "ix_sessions_project_root_status",
        "sessions",
        ["project_root", "status"],
    )
    # Sweep query: find sessions whose last activity is older than a cutoff.
    op.create_index(
        "ix_sessions_last_event_at",
        "sessions",
        ["last_event_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_sessions_last_event_at", table_name="sessions")
    op.drop_index("ix_sessions_project_root_status", table_name="sessions")
    op.drop_table("sessions")
