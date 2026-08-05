"""
Architecture Timeline service.
"""

from __future__ import annotations

import uuid

from app.features.architecture_timeline.domain import (
    ArchitectureTimeline,
    build_architecture_timeline,
)
from app.features.events.service import to_analyzable_event
from app.features.sessions import service as session_service
from app.features.sessions.models import Session
from app.features.timeline.service import _fetch_analyses, _fetch_session_events
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def get_architecture_timeline(
    db: AsyncSession, session_id: uuid.UUID
) -> ArchitectureTimeline | None:
    session = await session_service.get_session(db, session_id)
    if session is None:
        return None

    event_reads = await _fetch_session_events(db, session)
    events = [to_analyzable_event(event_read) for event_read in event_reads]
    analyses = await _fetch_analyses(db, [event.id for event in events])

    return build_architecture_timeline(
        events,
        analyses,
        session_started_at=session.started_at,
        session_ended_at=session.ended_at,
    )


async def get_project_architecture_timeline(
    db: AsyncSession, project_id: uuid.UUID
) -> ArchitectureTimeline | None:
    # Verify project exists
    # Wait, we can just fetch all sessions for the project
    result = await db.execute(
        select(Session).where(Session.project_id == project_id).order_by(Session.started_at.asc())
    )
    sessions = result.scalars().all()
    if not sessions:
        # Check if project actually exists by querying Project
        # but to save query, let's just return empty timeline if no sessions
        from app.features.projects.models import Project

        project = await db.get(Project, project_id)
        if not project:
            return None
        return ArchitectureTimeline(entries=[])

    all_events = []
    for session in sessions:
        event_reads = await _fetch_session_events(db, session)
        all_events.extend([to_analyzable_event(event_read) for event_read in event_reads])

    analyses = await _fetch_analyses(db, [event.id for event in all_events])

    # For project, we can just build one timeline by aggregating multiple timeline builds
    project_entries = []
    for session in sessions:
        session_events = [e for e in all_events if e.session_id == session.id]
        # We don't need to filter analyses, build_architecture_timeline will do it
        timeline = build_architecture_timeline(
            session_events,
            analyses,
            session_started_at=session.started_at,
            session_ended_at=session.ended_at,
        )
        project_entries.extend(timeline.entries)

    project_entries.sort(key=lambda e: e.timestamp)
    return ArchitectureTimeline(entries=project_entries)
