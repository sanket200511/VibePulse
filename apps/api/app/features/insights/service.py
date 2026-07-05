"""
Insights service — the only entry point for computing a Session Profile.

No persistence: every call recomputes the profile fresh from Timeline +
Session (approved refinement #3, docs/adr/0007-developer-intelligence-engine.md).
No new table, no new writes, no changes to sessions/service.py.

NOTE: intentional cross-feature import -- Insights exists specifically to
compose data from sessions and timeline into a projection, so this service
(not a router) is the integration seam, mirroring the precedent set by
timeline/service.py.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.insights.domain import SessionProfile, SessionProfileInput
from app.features.insights.engine import build_profile
from app.features.insights.registry import INSIGHT_GENERATORS
from app.features.sessions import service as session_service
from app.features.sessions.constants import SessionStatus
from app.features.timeline import service as timeline_service


async def get_profile(db: AsyncSession, session_id: uuid.UUID) -> SessionProfile | None:
    """
    Build the Developer Intelligence Engine profile for ``session_id``, or
    ``None`` if no such session exists. Always computes fresh -- no cache,
    no persisted profile.
    """
    session = await session_service.get_session(db, session_id)
    if session is None:
        return None

    timeline = await timeline_service.get_timeline(db, session_id)
    if timeline is None:
        return None

    profile_input = SessionProfileInput(
        entries=timeline.entries,
        outcome=timeline.outcome,
        session_status=SessionStatus(session.status),
        project_root=session.project_root,
        git_branch=session.git_branch,
    )

    return build_profile(
        session_id=session_id,
        generated_at=datetime.now(tz=UTC),
        profile_input=profile_input,
        generators=INSIGHT_GENERATORS,
    )
