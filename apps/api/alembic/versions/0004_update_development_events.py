"""update development_events columns for px-5.2

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-14

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add daemon_seq and server_received_at columns
    op.add_column(
        "development_events",
        sa.Column("daemon_seq", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "development_events",
        sa.Column(
            "server_received_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    # Alter file_path and file_name columns to be nullable
    op.alter_column("development_events", "file_path", nullable=True)
    op.alter_column("development_events", "file_name", nullable=True)


def downgrade() -> None:
    # Revert file_path and file_name to non-nullable (will fail if nulls exist, which is expected)
    op.alter_column("development_events", "file_name", nullable=False)
    op.alter_column("development_events", "file_path", nullable=False)
    # Remove columns
    op.drop_column("development_events", "server_received_at")
    op.drop_column("development_events", "daemon_seq")
