"""
Timeline service — the only entry point for constructing a Session Timeline.

Timeline is a read-only projection over three existing tables
(development_events, event_analyses, sessions); it introduces no new writes
and no new join table. Two queries per request, independent of event count:
one range query for a session's events, one bulk lookup for their analyses.
See docs/adr/0006-session-timeline.md.

NOTE: intentional cross-feature import — Timeline exists specifically to
compose data from events, analysis, and sessions into a projection, so this
service (not a router) is the integration seam, mirroring the precedent set
by events/router.py importing analysis/sessions services.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.analysis.models import EventAnalysis
from app.features.events.models import DevelopmentEvent
from app.features.events.schemas import DevelopmentEventRead
from app.features.events.service import to_analyzable_event
from app.features.sessions import service as session_service
from app.features.sessions.models import Session
from app.features.timeline.domain import Timeline, render


async def _fetch_session_events(db: AsyncSession, session: Session) -> list[DevelopmentEventRead]:
    end_reference = session.ended_at or datetime.now(tz=UTC)
    stmt = (
        select(DevelopmentEvent)
        .where(
            DevelopmentEvent.project_root == session.project_root,
            DevelopmentEvent.timestamp >= session.started_at,
            DevelopmentEvent.timestamp <= end_reference,
        )
        .order_by(DevelopmentEvent.timestamp.asc())
    )
    result = await db.execute(stmt)
    return [DevelopmentEventRead.from_orm_event(row) for row in result.scalars().all()]


async def _fetch_analyses(
    db: AsyncSession, event_ids: list[uuid.UUID]
) -> dict[uuid.UUID, dict[str, dict]]:
    if not event_ids:
        return {}
    stmt = select(EventAnalysis).where(EventAnalysis.event_id.in_(event_ids))
    result = await db.execute(stmt)
    grouped: dict[uuid.UUID, dict[str, dict]] = {}
    for row in result.scalars().all():
        grouped.setdefault(row.event_id, {})[row.analyzer_name] = row.findings
    return grouped


async def get_timeline(db: AsyncSession, session_id: uuid.UUID) -> Timeline | None:
    """
    Build the timeline for ``session_id``, or ``None`` if no such session
    exists. Works for any session status — ACTIVE/IDLE sessions render using
    "now" as the effective end and omit the SESSION_END marker.
    """
    session = await session_service.get_session(db, session_id)
    if session is None:
        return None

    event_reads = await _fetch_session_events(db, session)
    events = [to_analyzable_event(event_read) for event_read in event_reads]
    analyses = await _fetch_analyses(db, [event.id for event in events])

    return render(
        events,
        analyses,
        session_started_at=session.started_at,
        session_ended_at=session.ended_at,
        session_summary=session.summary,
    )
