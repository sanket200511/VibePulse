"""
DevelopmentEvent ORM model.

Single table for Sprint 1. project_id is intentionally deferred — we store
project_root as a plain path string until multi-project support demands a
stable project identity (see docs/adr/0003-event-driven-core.md).
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DevelopmentEvent(Base):
    __tablename__ = "development_events"
    __table_args__ = (
        # Idempotency guard: the same file/session/type/timestamp is a
        # duplicate observation (e.g. editor temp-file rename), not a new event.
        UniqueConstraint(
            "session_id",
            "file_path",
            "event_type",
            "timestamp",
            name="uq_development_events_dedupe",
        ),
        Index("ix_development_events_timestamp", "timestamp"),
        Index("ix_development_events_session_id", "session_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    schema_version: Mapped[int] = mapped_column(default=1, nullable=False)

    event_type: Mapped[str] = mapped_column(String(20), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    project_root: Mapped[str] = mapped_column(String(1024), nullable=False)

    file_path: Mapped[str] = mapped_column(String(2048), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_extension: Mapped[str | None] = mapped_column(String(20), nullable=True)
    language: Mapped[str | None] = mapped_column(String(50), nullable=True)
    git_branch: Mapped[str | None] = mapped_column(String(255), nullable=True)

    event_metadata: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, default=dict, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )
