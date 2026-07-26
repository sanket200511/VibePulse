"""
Session response schemas.

SessionRead is the single source of truth for the wire shape — used for the
REST responses (GET /sessions, /sessions/{id}, /sessions/current) and the
/ws/sessions broadcast payload, so REST and WebSocket clients never see
divergent contracts (mirrors the events feature's DevelopmentEventRead).

Metrics (duration, primary language, distinct file count) are computed here
from the Session's own aggregate counters and always included in the
response — the dashboard never re-derives them from raw data (approved
refinement #4).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict

from app.features.sessions.constants import SessionStatus
from app.features.sessions.summary import SessionSummary, _top_key

if TYPE_CHECKING:
    from app.features.sessions.models import Session


class SessionSummaryRead(BaseModel):
    """Serialised SessionSummary — present only once a session is COMPLETED."""

    model_config = ConfigDict(from_attributes=True)

    headline: str
    duration_seconds: float
    event_count: int
    primary_language: str | None
    distinct_file_count: int
    dominant_event_type: str | None

    @classmethod
    def from_summary(cls, summary: SessionSummary) -> SessionSummaryRead:
        return cls(
            headline=summary.headline,
            duration_seconds=summary.duration_seconds,
            event_count=summary.event_count,
            primary_language=summary.primary_language,
            distinct_file_count=summary.distinct_file_count,
            dominant_event_type=summary.dominant_event_type,
        )


class SessionRead(BaseModel):
    """Response shape for the sessions REST endpoints and the /ws/sessions broadcast."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID | None
    project_root: str
    status: SessionStatus
    started_at: datetime
    last_event_at: datetime
    ended_at: datetime | None
    git_branch: str | None

    # Raw counters — kept for completeness / future extensions (e.g. Replay).
    event_count: int
    events_by_type: dict[str, int]
    languages: dict[str, int]

    # Computed metrics — exposed directly, not left for dashboard-side math.
    duration_seconds: float
    primary_language: str | None
    distinct_file_count: int

    summary: SessionSummaryRead | None

    @classmethod
    def from_session(cls, session: Session, *, effective_status: SessionStatus) -> SessionRead:
        end_reference = session.ended_at or session.last_event_at
        duration_seconds = max((end_reference - session.started_at).total_seconds(), 0.0)
        return cls(
            id=session.id,
            project_id=session.project_id,
            project_root=session.project_root,
            status=effective_status,
            started_at=session.started_at,
            last_event_at=session.last_event_at,
            ended_at=session.ended_at,
            git_branch=session.git_branch,
            event_count=session.event_count,
            events_by_type=session.events_by_type,
            languages=session.languages,
            duration_seconds=duration_seconds,
            primary_language=_top_key(session.languages),
            distinct_file_count=len(session.files),
            summary=(
                SessionSummaryRead.model_validate(session.summary)
                if session.summary is not None
                else None
            ),
        )


class SessionListRead(BaseModel):
    """Response shape for GET /sessions."""

    sessions: list[SessionRead]
