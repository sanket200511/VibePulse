"""create incident_review_history table

Revision ID: 0008
Revises: 0007
Create Date: 2026-08-21 12:15:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "incident_review_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("incident_id", sa.String(length=64), nullable=False),
        sa.Column("previous_status", sa.String(length=32), nullable=False),
        sa.Column("new_status", sa.String(length=32), nullable=False),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column(
            "reviewer",
            sa.String(length=128),
            nullable=False,
            server_default="Local Developer",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_incident_review_history_project_id",
        "incident_review_history",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        "ix_incident_review_history_incident_id",
        "incident_review_history",
        ["incident_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_incident_review_history_incident_id", table_name="incident_review_history")
    op.drop_index("ix_incident_review_history_project_id", table_name="incident_review_history")
    op.drop_table("incident_review_history")
