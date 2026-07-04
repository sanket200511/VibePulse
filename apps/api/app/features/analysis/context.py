"""
Builds an ``AnalysisContext`` by querying the database for ambient session data.

Uses raw SQL via ``sqlalchemy.text`` instead of importing the
``DevelopmentEvent`` ORM model, keeping the analysis feature decoupled from
the events feature (ADR 0002).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.domain.events import AnalyzableEvent
from app.features.analysis.base import AnalysisContext, SessionActivityContext


async def build_context(
    event: AnalyzableEvent,
    db: AsyncSession,
) -> AnalysisContext:
    """
    Fetch ambient session statistics and return an ``AnalysisContext``.

    All data is read with a single query so analyzers receive a consistent
    snapshot without issuing their own DB calls.
    """
    now = datetime.now(tz=UTC)
    five_min_ago = now - timedelta(minutes=5)
    one_hour_ago = now - timedelta(hours=1)

    result = await db.execute(
        text(
            """
            SELECT
                COUNT(*) FILTER (WHERE timestamp >= :five_min_ago)  AS events_last_5min,
                COUNT(*) FILTER (WHERE timestamp >= :one_hour_ago)  AS events_last_hour
            FROM development_events
            WHERE session_id = :session_id
            """
        ),
        {
            "session_id": str(event.session_id),
            "five_min_ago": five_min_ago,
            "one_hour_ago": one_hour_ago,
        },
    )
    row = result.one()

    return AnalysisContext(
        session_activity=SessionActivityContext(
            events_last_5min=int(row.events_last_5min),
            events_last_hour=int(row.events_last_hour),
        ),
    )
