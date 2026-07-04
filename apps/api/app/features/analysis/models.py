"""
ORM model for persisted analysis results.

One row per (event, analyzer) pair.  The ``findings`` column is JSONB and its
schema is owned by each analyzer class — see the individual analyzer modules
for documentation.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class EventAnalysis(Base):
    """
    Stores the structured output of one analyzer run for one event.

    Constraints
    -----------
    uq_event_analyses_event_analyzer
        Unique on (event_id, analyzer_name) so that ``ON CONFLICT DO UPDATE``
        can perform idempotent upserts on pipeline re-runs.

    FK cascade
        Deleting a ``DevelopmentEvent`` row cascades to all its analyses,
        keeping test teardown simple (delete the parent, children follow).
    """

    __tablename__ = "event_analyses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("development_events.id", ondelete="CASCADE"),
        nullable=False,
    )
    analyzer_name: Mapped[str] = mapped_column(String(64), nullable=False)
    analyzer_version: Mapped[int] = mapped_column(Integer, nullable=False)

    # Structured output from the analyzer; schema defined per-analyzer.
    findings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Wall-clock cost of this analyzer run in milliseconds.
    duration_ms: Mapped[float] = mapped_column(Float, nullable=False)

    # Non-None when the analyzer raised an exception.
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        # Primary lookup: fetch all analyses for an event.
        Index("ix_event_analyses_event_id", "event_id"),
        # Unique constraint used by ON CONFLICT DO UPDATE.
        Index(
            "uq_event_analyses_event_analyzer",
            "event_id",
            "analyzer_name",
            unique=True,
        ),
    )
