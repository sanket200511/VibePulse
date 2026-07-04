"""
Session summary generation — kept behind an interface (approved refinement #3)
so a future implementation (e.g. an AI-generated narrative summary) can
replace today's heuristic aggregation without touching lifecycle/state-machine
code in service.py. Mirrors the ``Analyzer`` Protocol pattern used by the
analysis feature (docs/adr/0004-analysis-pipeline.md).

Everything in this module is framework-agnostic — no SQLAlchemy, no FastAPI.
Implementations are synchronous and side-effect free: they operate purely on
a ``SessionSnapshot`` (a plain read of the Session's own aggregate counters),
never on a DB session or raw event history.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class SessionSnapshot:
    """
    Framework-agnostic snapshot of a Session's aggregate state at the moment
    it is finalized. Built from the ORM row in service.py so this module
    never needs to import SQLAlchemy models.
    """

    project_root: str
    started_at: datetime
    last_event_at: datetime
    event_count: int
    events_by_type: dict[str, int]
    languages: dict[str, int]
    files: dict[str, int]
    git_branch: str | None


@dataclass(frozen=True)
class SessionSummary:
    """Structured summary produced when a session completes."""

    headline: str
    duration_seconds: float
    event_count: int
    primary_language: str | None
    distinct_file_count: int
    dominant_event_type: str | None


@runtime_checkable
class SessionSummaryGenerator(Protocol):
    """
    Contract every summary generator must satisfy.

    Attribute semantics mirror ``Analyzer`` in the analysis feature: ``name``
    identifies the implementation (stored alongside the summary for
    traceability), ``version`` is bumped when the summary shape changes.
    """

    name: str
    version: int

    def generate(self, snapshot: SessionSnapshot) -> SessionSummary:
        """Produce a summary from a session's final aggregate state."""
        ...


def _top_key(counts: dict[str, int]) -> str | None:
    if not counts:
        return None
    return max(counts.items(), key=lambda item: item[1])[0]


class HeuristicSessionSummaryGenerator:
    """
    Default summary generator: rule-based aggregation over counters already
    maintained on the Session domain (no additional DB queries required).
    """

    name = "heuristic_v1"
    version = 1

    def generate(self, snapshot: SessionSnapshot) -> SessionSummary:
        duration_seconds = max((snapshot.last_event_at - snapshot.started_at).total_seconds(), 0.0)
        primary_language = _top_key(snapshot.languages)
        dominant_event_type = _top_key(snapshot.events_by_type)
        distinct_file_count = len(snapshot.files)

        minutes = round(duration_seconds / 60, 1)
        headline_parts = [f"{snapshot.event_count} events"]
        if distinct_file_count:
            headline_parts.append(f"across {distinct_file_count} file(s)")
        if primary_language:
            headline_parts.append(f"mostly in {primary_language}")
        headline_parts.append(f"over {minutes} min")
        headline = " ".join(headline_parts)

        return SessionSummary(
            headline=headline,
            duration_seconds=duration_seconds,
            event_count=snapshot.event_count,
            primary_language=primary_language,
            distinct_file_count=distinct_file_count,
            dominant_event_type=dominant_event_type,
        )


# Module-level singleton, swappable in the future by changing this one line
# (or by promoting it to a registry, mirroring analysis/registry.py, if more
# than one implementation needs to coexist).
DEFAULT_SUMMARY_GENERATOR: SessionSummaryGenerator = HeuristicSessionSummaryGenerator()
