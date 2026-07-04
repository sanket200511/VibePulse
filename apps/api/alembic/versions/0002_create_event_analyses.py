"""create event_analyses table

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-03

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "event_analyses",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "event_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "development_events.id",
                ondelete="CASCADE",
                name="fk_event_analyses_event_id",
            ),
            nullable=False,
        ),
        sa.Column("analyzer_name", sa.String(length=64), nullable=False),
        sa.Column("analyzer_version", sa.Integer(), nullable=False),
        sa.Column(
            "findings",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("duration_ms", sa.Float(), nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    # Primary lookup: all analyses for a given event.
    op.create_index(
        "ix_event_analyses_event_id",
        "event_analyses",
        ["event_id"],
    )
    # Unique constraint used by ON CONFLICT DO UPDATE in the repository.
    op.create_index(
        "uq_event_analyses_event_analyzer",
        "event_analyses",
        ["event_id", "analyzer_name"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_event_analyses_event_analyzer", table_name="event_analyses")
    op.drop_index("ix_event_analyses_event_id", table_name="event_analyses")
    op.drop_table("event_analyses")
