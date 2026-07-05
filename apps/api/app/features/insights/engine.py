"""
Developer Intelligence Engine — orchestrates insight generators and produces
a SessionProfile.

Mirrors AnalysisPipeline (analysis/pipeline.py) exactly: generators are
filtered by ``enabled``, sorted by ``priority``, and run with per-generator
try/except isolation so one failing generator never aborts the whole
profile. See docs/adr/0007-developer-intelligence-engine.md.
"""

from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime

from app.features.insights.domain import (
    DeveloperInsight,
    InsightCategory,
    InsightGenerator,
    SessionProfile,
    SessionProfileInput,
)

logger = logging.getLogger(__name__)


def build_profile(
    *,
    session_id: uuid.UUID,
    generated_at: datetime,
    profile_input: SessionProfileInput,
    generators: list[InsightGenerator],
) -> SessionProfile:
    """
    Run every enabled generator, sorted by priority, and group their
    insights by category. A category with no produced insights is simply
    absent from the result rather than present with an empty list.
    """
    ordered = sorted([g for g in generators if g.enabled], key=lambda g: g.priority)

    categories: dict[InsightCategory, list[DeveloperInsight]] = {}
    for generator in ordered:
        insights = _run_one(generator, profile_input)
        if insights:
            categories.setdefault(generator.category, []).extend(insights)

    return SessionProfile(session_id=session_id, generated_at=generated_at, categories=categories)


def _run_one(
    generator: InsightGenerator, profile_input: SessionProfileInput
) -> list[DeveloperInsight]:
    """Run one generator, isolating any failure so it never aborts the profile."""
    start = time.perf_counter()
    try:
        return generator.generate(profile_input)
    except Exception as exc:
        duration_ms = round((time.perf_counter() - start) * 1000, 3)
        logger.error(
            "insight_generator_error",
            extra={
                "generator_name": generator.name,
                "generator_version": generator.version,
                "duration_ms": duration_ms,
                "error": str(exc),
            },
            exc_info=True,
        )
        return []
