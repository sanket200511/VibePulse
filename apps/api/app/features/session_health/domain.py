"""
Health Engine domain — pure, framework-free session-health data model.

Health is a projection over an already-rendered Timeline (TimelineOutcome,
TimelineEntry) and an already-derived Replay (ReplayChapter): it never
re-derives idle detection, grouping, or chapter boundaries itself, and it
never invokes any AI/ML model. Every HealthMetric is arithmetic over
already-observed structure, mapped to a fixed, named threshold band. Health
evaluates the SESSION, never the developer -- there is no ranking, no
cross-session comparison, and no single composite score anywhere in this
module. See docs/adr/0009-health-engine.md.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any, Protocol, runtime_checkable

from app.features.replay.domain import ChapterKind, ReplayChapter
from app.features.timeline.domain import TimelineEntry, TimelineEntryKind, TimelineOutcome


class HealthCategory(StrEnum):
    FOCUS = "FOCUS"
    MOMENTUM = "MOMENTUM"
    FLOW = "FLOW"
    STABILITY = "STABILITY"
    COMPLETION = "COMPLETION"


@dataclass(frozen=True)
class HealthMetric:
    """
    One category's verdict about the session's shape. ``metrics`` always
    carries the raw numbers ``label``/``headline`` were derived from -- a
    label is never presented without its evidence being inspectable.
    """

    id: uuid.UUID
    category: HealthCategory
    generator_name: str
    generator_version: int
    label: str
    headline: str
    evidence: str | None
    metrics: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class HealthInput:
    """
    All pre-fetched data a HealthGenerator may need, built once by
    health/service.py from Timeline + Replay and passed to every generator.
    """

    outcome: TimelineOutcome
    chapters: list[ReplayChapter]
    entries: list[TimelineEntry]


@dataclass(frozen=True)
class HealthSummary:
    """A deterministic synthesis of the five headlines, plus optional guidance."""

    narrative: str
    guidance: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class HealthReport:
    """
    Full Health Engine output for a session: one HealthMetric per category
    (sparse -- a category is absent only if its generator returned None) plus
    a synthesized summary. Deliberately has no numeric score field anywhere.
    """

    session_id: uuid.UUID
    generated_at: datetime
    metrics: dict[HealthCategory, HealthMetric] = field(default_factory=dict)
    summary: HealthSummary = field(default_factory=lambda: HealthSummary(narrative=""))


@runtime_checkable
class HealthGenerator(Protocol):
    """
    Contract every health generator must satisfy. Mirrors InsightGenerator
    (insights/domain.py) exactly, except generate() returns a single
    HealthMetric or None -- one category, one verdict, or an honest "not
    enough data", never a fabricated one.

    Attribute semantics
    -------------------
    name        Stable snake_case identifier.
    version     Increment when the metric/metrics schema changes.
    category    The HealthCategory this generator produces.
    description Human-readable summary.
    priority    Execution order; lower numbers run first.
    enabled     When False the engine skips this generator entirely.
    """

    name: str
    version: int
    category: HealthCategory
    description: str
    priority: int
    enabled: bool

    def generate(self, health_input: HealthInput) -> HealthMetric | None:
        """
        Inspect the health input and return this category's verdict, or None
        if the session has insufficient signal to compute it.

        Must be synchronous and free of side effects. Raising is safe -- the
        engine catches it, logs it, and continues with the next generator.
        """
        ...


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def work_chapters(chapters: list[ReplayChapter]) -> list[ReplayChapter]:
    return [c for c in chapters if c.kind in (ChapterKind.WORK, ChapterKind.RESUMED)]


def idle_chapters(chapters: list[ReplayChapter]) -> list[ReplayChapter]:
    return [c for c in chapters if c.kind == ChapterKind.IDLE]


def content_entries(entries: list[TimelineEntry]) -> list[TimelineEntry]:
    return [e for e in entries if e.entry_kind != TimelineEntryKind.MARKER]


def new_metric(
    *,
    category: HealthCategory,
    generator_name: str,
    generator_version: int,
    label: str,
    headline: str,
    evidence: str | None,
    metrics: dict[str, Any] | None = None,
) -> HealthMetric:
    return HealthMetric(
        id=uuid.uuid4(),
        category=category,
        generator_name=generator_name,
        generator_version=generator_version,
        label=label,
        headline=headline,
        evidence=evidence,
        metrics=metrics or {},
    )


def format_duration(seconds: float) -> str:
    if seconds < 60:
        return f"{round(seconds)}s"
    minutes = int(seconds // 60)
    remainder = round(seconds % 60)
    return f"{minutes}m {remainder}s" if remainder else f"{minutes}m"
