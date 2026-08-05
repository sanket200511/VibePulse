"""
Builds an ``AnalysisContext`` by querying the database for ambient session data.

Uses raw SQL via ``sqlalchemy.text`` instead of importing the
``DevelopmentEvent`` ORM model, keeping the analysis feature decoupled from
the events feature (ADR 0002).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

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

    previous_findings: dict[str, dict[str, Any]] = {}
    if event.file_path:
        prev_analysis_result = await db.execute(
            text(
                """
                SELECT a.analyzer_name, a.findings
                FROM event_analyses a
                JOIN development_events e ON a.event_id = e.id
                WHERE e.project_root = :project_root
                  AND e.file_path = :file_path
                  AND e.timestamp < :timestamp
                ORDER BY e.timestamp DESC
                """
            ),
            {
                "project_root": event.project_root,
                "file_path": event.file_path,
                "timestamp": event.timestamp,
            },
        )
        # Only take the most recent finding for each analyzer
        for a_row in prev_analysis_result.all():
            name = a_row.analyzer_name
            if name not in previous_findings:
                previous_findings[name] = a_row.findings

    return AnalysisContext(
        session_activity=SessionActivityContext(
            events_last_5min=int(row.events_last_5min),
            events_last_hour=int(row.events_last_hour),
        ),
        previous_findings=previous_findings,
    )
