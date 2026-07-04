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

logger = logging.getLogger(__name__)

# Module-level singletons — constructed once, shared across all dispatches.
_pipeline = AnalysisPipeline(ANALYZERS)
_repository = AnalysisRepository()


async def dispatch(
    event: AnalyzableEvent,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """
    Run the analysis pipeline for ``event`` in a dedicated DB session.

    Parameters
    ----------
    event:
        The immutable domain snapshot built from the just-stored event.
    session_factory:
        ``AsyncSessionLocal`` from ``app.core.database`` — injected so that
        this function is independently testable without the application context.
    """
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
            except Exception:
                await db.rollback()
                raise
    except Exception:
        logger.error(
            "analysis_dispatch_error",
            extra={"event_id": str(event.id)},
            exc_info=True,
        )
