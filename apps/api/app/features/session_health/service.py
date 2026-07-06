"""
Health service — the only entry point for computing a Health Report.

No persistence: every call recomputes the report fresh from Timeline +
Replay (same rationale as replay/service.py and insights/service.py,
docs/adr/0009-health-engine.md). No new table, no new writes.

NOTE: intentional cross-feature import -- Health exists specifically to
compose data from timeline and replay into a projection, so this service
(not a router) is the integration seam, mirroring the precedent set by
replay/service.py and insights/service.py.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.replay import service as replay_service
from app.features.session_health.domain import HealthInput, HealthReport
from app.features.session_health.engine import build_health_report
from app.features.session_health.registry import HEALTH_GENERATORS
from app.features.timeline import service as timeline_service


async def get_health(db: AsyncSession, session_id: uuid.UUID) -> HealthReport | None:
    """
    Build the Health Report for ``session_id``, or ``None`` if no such
    session exists. Raises ConflictError (via replay_service.get_replay) if
    the session is not yet COMPLETED. Always computes fresh -- no cache, no
    persisted report.
    """
    replay = await replay_service.get_replay(db, session_id)
    if replay is None:
        return None

    timeline = await timeline_service.get_timeline(db, session_id)
    if timeline is None:
        return None

    health_input = HealthInput(
        outcome=timeline.outcome,
        chapters=replay.chapters,
        entries=timeline.entries,
    )

    return build_health_report(
        session_id=session_id,
        generated_at=datetime.now(tz=UTC),
        health_input=health_input,
        generators=HEALTH_GENERATORS,
    )
