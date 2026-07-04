"""
Core contracts and result types for the analysis pipeline.

Everything in this module is framework-agnostic — no SQLAlchemy, no FastAPI,
no Pydantic.  It is imported by analyzers, the pipeline, and the repository.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable

from app.core.domain.events import AnalyzableEvent

# ---------------------------------------------------------------------------
# Context types (pre-fetched data passed to analyzers instead of a DB session)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class SessionActivityContext:
    """Recent event counts for the session that owns this event."""

    events_last_5min: int
    events_last_hour: int


@dataclass(frozen=True)
class AnalysisContext:
    """
    All ambient data an analyzer may need, hydrated before the pipeline runs.

    Adding new data here (e.g. git history, prior findings) is a non-breaking
    extension — existing analyzers ignore fields they don't use.
    """

    session_activity: SessionActivityContext


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass
class AnalysisFinding:
    """
    The structured output of a single analyzer for a single event.

    ``findings`` is a free-form dict; the schema is defined per-analyzer and
    documented in each analyzer class.  The DB stores it as JSONB.
    """

    analyzer_name: str
    analyzer_version: int
    findings: dict[str, Any] = field(default_factory=dict)


@dataclass
class AnalyzerExecution:
    """
    Records both the outcome and the wall-clock cost of one analyzer run.

    Exactly one of ``finding`` or ``error`` will be non-None after a run;
    both may be None if the analyzer returned ``None`` (opted out).
    """

    analyzer_name: str
    duration_ms: float
    finding: AnalysisFinding | None = None
    error: str | None = None


@dataclass
class AnalysisResult:
    """
    The aggregate outcome of running the full pipeline for one event.

    Produced by ``AnalysisPipeline.run()`` and consumed by
    ``AnalysisRepository.save()``.  The pipeline does not persist anything
    itself — separation of orchestration from persistence (approved design).
    """

    event_id: uuid.UUID
    executions: list[AnalyzerExecution] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Analyzer Protocol
# ---------------------------------------------------------------------------


@runtime_checkable
class Analyzer(Protocol):
    """
    Contract that every analysis plugin must satisfy.

    Implementations are plain classes (no base class required) as long as they
    expose the required attributes and the ``analyze`` method.

    Attribute semantics
    -------------------
    name        Stable snake_case identifier used as the primary key in the DB.
    version     Increment when findings schema changes (enables migration).
    description Human-readable summary shown in docs / admin UI.
    priority    Execution order; lower numbers run first.
    enabled     When False the pipeline skips this analyzer entirely.
    """

    name: str
    version: int
    description: str
    priority: int
    enabled: bool

    def analyze(
        self,
        event: AnalyzableEvent,
        context: AnalysisContext,
    ) -> AnalysisFinding | None:
        """
        Inspect the event and return a finding, or ``None`` to opt out.

        Must be synchronous and free of side-effects (no DB writes, no HTTP).
        Raising an exception is safe — the pipeline catches it, records the
        error, and continues with the next analyzer.
        """
        ...
