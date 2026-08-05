"""
Analysis pipeline — orchestrates analyzers and produces ``AnalysisResult``.

The pipeline does **not** persist anything; that is the repository's job
(separation of orchestration from persistence — approved design constraint).
"""

from __future__ import annotations

import logging
import time

from app.core.domain.events import AnalyzableEvent
from app.features.analysis.base import (
    AnalysisContext,
    AnalysisFinding,
    AnalysisResult,
    Analyzer,
    AnalyzerExecution,
)

logger = logging.getLogger(__name__)


class AnalysisPipeline:
    """
    Runs a sorted, filtered list of analyzers against a single event.

    Construction
    ------------
    Accepts a list of ``Analyzer`` instances.  Disabled analyzers are
    filtered out at construction time; the remaining set is sorted by
    ``priority`` (ascending — lower numbers run first).

    Thread-safety
    -------------
    ``run()`` is a coroutine but the individual ``analyze()`` calls are
    synchronous (per the Protocol contract).  The pipeline itself carries no
    mutable state beyond the immutable analyzer list, so it is safe to share
    a single instance across concurrent requests.
    """

    def __init__(self, analyzers: list[Analyzer]) -> None:
        self._analyzers: list[Analyzer] = sorted(
            [a for a in analyzers if a.enabled],
            key=lambda a: a.priority,
        )

    async def run(
        self,
        event: AnalyzableEvent,
        context: AnalysisContext,
    ) -> AnalysisResult:
        """
        Execute every enabled analyzer and return a consolidated result.

        Individual analyzer failures are caught, logged, and recorded as
        ``error`` executions — they do not abort the pipeline.
        """
        executions: list[AnalyzerExecution] = []
        for analyzer in self._analyzers:
            execution = await self._run_one(analyzer, event, context)
            if execution.finding:
                context.current_findings[analyzer.name] = execution.finding.findings
            executions.append(execution)
        return AnalysisResult(event_id=event.id, executions=executions)

    async def _run_one(
        self,
        analyzer: Analyzer,
        event: AnalyzableEvent,
        context: AnalysisContext,
    ) -> AnalyzerExecution:
        """Run one analyzer, capturing its wall-clock duration and any error."""
        start = time.perf_counter()
        finding: AnalysisFinding | None = None
        error: str | None = None

        try:
            finding = analyzer.analyze(event, context)
        except Exception as exc:
            error = str(exc)
            logger.error(
                "analyzer_error",
                extra={
                    "analyzer_name": analyzer.name,
                    "analyzer_version": analyzer.version,
                    "event_id": str(event.id),
                    "error": error,
                },
                exc_info=True,
            )
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 3)

        return AnalyzerExecution(
            analyzer_name=analyzer.name,
            duration_ms=duration_ms,
            finding=finding,
            error=error,
        )
