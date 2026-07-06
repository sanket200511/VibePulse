"""
Health Engine — orchestrates health generators and produces a HealthReport.

Mirrors build_profile (insights/engine.py) exactly: generators are filtered
by ``enabled``, sorted by ``priority``, and run with per-generator try/except
isolation so one failing generator never aborts the whole report. A second
phase, ``derive_guidance``, runs over the resulting metrics to produce a
small set of deterministic, rule-based observations -- never free-text
generation, never a judgment about the developer. See
docs/adr/0009-health-engine.md.
"""

from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime

from app.features.session_health.domain import (
    HealthCategory,
    HealthGenerator,
    HealthInput,
    HealthMetric,
    HealthReport,
    HealthSummary,
)

logger = logging.getLogger(__name__)

HEALTH_MAX_GUIDANCE_ITEMS = 4

_CATEGORY_ORDER: tuple[HealthCategory, ...] = (
    HealthCategory.FOCUS,
    HealthCategory.MOMENTUM,
    HealthCategory.FLOW,
    HealthCategory.STABILITY,
    HealthCategory.COMPLETION,
)


def build_health_report(
    *,
    session_id: uuid.UUID,
    generated_at: datetime,
    health_input: HealthInput,
    generators: list[HealthGenerator],
) -> HealthReport:
    """
    Run every enabled generator, sorted by priority, into a metrics dict
    keyed by category, then derive the summary narrative and guidance from
    the resulting metrics.
    """
    ordered = sorted([g for g in generators if g.enabled], key=lambda g: g.priority)

    metrics: dict[HealthCategory, HealthMetric] = {}
    for generator in ordered:
        metric = _run_one(generator, health_input)
        if metric is not None:
            metrics[generator.category] = metric

    summary = HealthSummary(narrative=_derive_narrative(metrics), guidance=derive_guidance(metrics))

    return HealthReport(
        session_id=session_id, generated_at=generated_at, metrics=metrics, summary=summary
    )


def _run_one(generator: HealthGenerator, health_input: HealthInput) -> HealthMetric | None:
    """Run one generator, isolating any failure so it never aborts the report."""
    start = time.perf_counter()
    try:
        return generator.generate(health_input)
    except Exception as exc:
        duration_ms = round((time.perf_counter() - start) * 1000, 3)
        logger.error(
            "health_generator_error",
            extra={
                "generator_name": generator.name,
                "generator_version": generator.version,
                "duration_ms": duration_ms,
                "error": str(exc),
            },
            exc_info=True,
        )
        return None


def _derive_narrative(metrics: dict[HealthCategory, HealthMetric]) -> str:
    """Deterministically concatenate the five headlines, in fixed category order."""
    headlines = [metrics[category].headline for category in _CATEGORY_ORDER if category in metrics]
    return " ".join(headlines)


def derive_guidance(metrics: dict[HealthCategory, HealthMetric]) -> list[str]:
    """
    A small, ordered rule table matching on the categorical labels already
    computed by the generators -- never raw numbers, never free-text
    generation. Every string is phrased about the session's shape, never
    about the developer. Capped at HEALTH_MAX_GUIDANCE_ITEMS so the panel
    never becomes a wall of text.
    """
    focus = metrics.get(HealthCategory.FOCUS)
    momentum = metrics.get(HealthCategory.MOMENTUM)
    flow = metrics.get(HealthCategory.FLOW)
    stability = metrics.get(HealthCategory.STABILITY)
    completion = metrics.get(HealthCategory.COMPLETION)

    guidance: list[str] = []

    if flow is not None and flow.label in {"Fragmented Focus", "Scattered Across Topics"}:
        guidance.append(
            "This session moved across many different areas of work — grouping related "
            "changes together may make future sessions easier to review."
        )

    if momentum is not None and momentum.label == "Frequently Interrupted":
        guidance.append(
            "Frequent interruptions broke work into short stretches. Long uninterrupted "
            "blocks were rare in this session."
        )

    if completion is not None and completion.label == "Concluded Mid-Work":
        guidance.append("The session ended while work was still active, with no wind-down period.")

    if stability is not None and stability.label == "Erratic Pace":
        guidance.append(
            "Editing activity was uneven, with bursts of activity separated by quiet stretches."
        )

    if (
        focus is not None
        and momentum is not None
        and focus.label == "Highly Focused"
        and momentum.label in {"Strong Momentum", "Steady Momentum"}
    ):
        guidance.append("This session showed sustained, focused work with few interruptions.")

    return guidance[:HEALTH_MAX_GUIDANCE_ITEMS]
