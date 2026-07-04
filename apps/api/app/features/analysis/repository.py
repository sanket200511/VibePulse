"""
Persistence layer for analysis results.

The repository is the *only* place that touches the ``event_analyses`` table.
It does not commit — the caller (``analysis/service.py``) owns the transaction
so that the commit boundary is explicit and testable.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.analysis.base import AnalysisResult
from app.features.analysis.models import EventAnalysis


class AnalysisRepository:
    """Upserts ``AnalysisResult`` executions into the ``event_analyses`` table."""

    async def save(self, result: AnalysisResult, db: AsyncSession) -> None:
        """
        Persist every execution that produced a finding or recorded an error.

        Executions where ``finding`` is ``None`` and ``error`` is ``None``
        (i.e. the analyzer opted out) are skipped — there is nothing to store.

        Uses ``INSERT … ON CONFLICT DO UPDATE`` so re-running the pipeline for
        the same event is idempotent: existing rows are updated in place.
        """
        rows: list[dict[str, Any]] = []

        for execution in result.executions:
            # Skip opt-outs (analyzer returned None, no error either).
            if execution.finding is None and execution.error is None:
                continue

            row: dict[str, Any] = {
                "id": uuid.uuid4(),
                "event_id": result.event_id,
                "analyzer_name": execution.analyzer_name,
                "analyzer_version": (
                    execution.finding.analyzer_version if execution.finding is not None else 0
                ),
                "findings": (execution.finding.findings if execution.finding is not None else {}),
                "duration_ms": execution.duration_ms,
                "error": execution.error,
            }
            rows.append(row)

        if not rows:
            return

        stmt = pg_insert(EventAnalysis).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=["event_id", "analyzer_name"],
            set_={
                "analyzer_version": stmt.excluded.analyzer_version,
                "findings": stmt.excluded.findings,
                "duration_ms": stmt.excluded.duration_ms,
                "error": stmt.excluded.error,
            },
        )
        await db.execute(stmt)
