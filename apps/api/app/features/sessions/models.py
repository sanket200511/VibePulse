"""
Session ORM model.

A Session represents one continuous period of development activity for a
single project. Its identity is owned entirely by the Session Engine
(this feature) — the daemon's per-process ``session_id`` is stored only as
an informational hint (``daemon_session_id``); it is never used as the
Session's primary key or trusted as the authority on session boundaries.
See docs/adr/0005-session-engine.md.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.features.sessions.constants import SessionStatus


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = (
        # Primary lookup: "is there an open session for this project?"
        Index("ix_sessions_project_root_status", "project_root", "status"),
        # Sweep query: find sessions whose last activity is older than a cutoff.
        Index("ix_sessions_last_event_at", "last_event_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    project_root: Mapped[str] = mapped_column(String(1024), nullable=False)

    # Informational only — see module docstring. Nullable because a future
    # event source may not supply one.
    daemon_session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    status: Mapped[str] = mapped_column(
        String(20), default=SessionStatus.ACTIVE.value, nullable=False
    )

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_event_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    event_count: Mapped[int] = mapped_column(default=0, nullable=False)

    # Aggregate counters, updated incrementally as events arrive. Exposed
    # directly on the Session domain (via schemas.py) so the dashboard never
    # has to re-derive them from raw event history (approved refinement #4).
    events_by_type: Mapped[dict[str, int]] = mapped_column(JSONB, default=dict, nullable=False)
    languages: Mapped[dict[str, int]] = mapped_column(JSONB, default=dict, nullable=False)
    files: Mapped[dict[str, int]] = mapped_column(JSONB, default=dict, nullable=False)

    git_branch: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Populated once, when the session transitions to COMPLETED. Produced by
    # a SessionSummaryGenerator implementation (see summary.py) — the
    # lifecycle code that writes this column never knows which implementation
    # produced it.
    summary: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )
