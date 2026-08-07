"""
Analysis service — background task entry point.

``dispatch()`` is called from the events router via FastAPI's
``BackgroundTasks``.  It owns the full lifecycle of one analysis run:
  1. Open a fresh DB session (separate from the HTTP request's session).
  2. Build the ``AnalysisContext``.
  3. Run the pipeline.
  4. Persist the result via the repository.
  5. Commit or roll back.

Any exception at any step is caught and logged; the background task must never
crash the process.
"""

from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.domain.events import AnalyzableEvent
from app.features.analysis.context import build_context
from app.features.analysis.pipeline import AnalysisPipeline
from app.features.analysis.registry import ANALYZERS
from app.features.analysis.repository import AnalysisRepository
from app.features.architecture_timeline.domain import build_architecture_timeline
from app.features.architecture_timeline.schemas import ArchitectureTimelineEntryRead
from app.features.events.connection_manager import connection_manager

logger = logging.getLogger(__name__)

# Module-level singletons — constructed once, shared across all dispatches.
_pipeline = AnalysisPipeline(ANALYZERS)
_repository = AnalysisRepository()


async def dispatch(
    event: AnalyzableEvent,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    try:
        async with session_factory() as db:
            try:
                context = await build_context(event, db)
                result = await _pipeline.run(event, context)
                await _repository.save(result, db)
                await db.commit()
                logger.info(
                    "analysis_complete",
                    extra={
                        "event_id": str(event.id),
                        "analyzers_run": len(result.executions),
                    },
                )

                # Build architectural timeline entries for this single event
                analyses_dict = {
                    event.id: {
                        ex.analyzer_name: ex.finding.findings
                        for ex in result.executions
                        if ex.finding
                    }
                }
                timeline = build_architecture_timeline(
                    [event],
                    analyses_dict,
                    session_started_at=event.timestamp,  # dummy for session start/end
                    session_ended_at=None,
                )
                # Filter out SESSION_START / SESSION_END which are artifacts of building
                real_entries = [
                    e for e in timeline.entries if e.kind not in ("SESSION_START", "SESSION_END")
                ]
                entry_reads = [
                    ArchitectureTimelineEntryRead.from_entry(e).model_dump(mode="json")
                    for e in real_entries
                ]

                await connection_manager.broadcast(
                    {
                        "type": "ANALYSIS_COMPLETE",
                        "event_id": str(event.id),
                        "session_id": str(event.session_id) if event.session_id else None,
                        "entries": entry_reads,
                    }
                )

            except Exception:
                await db.rollback()
                logger.exception("Analysis pipeline failed")
    except Exception:
        logger.error(
            "analysis_dispatch_error",
            extra={"event_id": str(event.id)},
            exc_info=True,
        )
