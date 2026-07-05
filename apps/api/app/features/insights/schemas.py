"""
Insights response schemas — wire shapes for GET /sessions/{session_id}/profile
and GET /sessions/{session_id}/insights.

Mirrors the DeveloperInsight headline/evidence/metrics split from domain.py
rather than flattening it (approved refinement #2,
docs/adr/0007-developer-intelligence-engine.md).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.features.insights.domain import DeveloperInsight, InsightCategory, SessionProfile


class DeveloperInsightRead(BaseModel):
    id: uuid.UUID
    category: InsightCategory
    generator_name: str
    generator_version: int
    headline: str
    evidence: str | None
    metrics: dict[str, Any]

    @classmethod
    def from_insight(cls, insight: DeveloperInsight) -> DeveloperInsightRead:
        return cls(
            id=insight.id,
            category=insight.category,
            generator_name=insight.generator_name,
            generator_version=insight.generator_version,
            headline=insight.headline,
            evidence=insight.evidence,
            metrics=insight.metrics,
        )


class SessionProfileRead(BaseModel):
    """Response shape for GET /sessions/{session_id}/profile."""

    session_id: uuid.UUID
    generated_at: datetime
    categories: dict[InsightCategory, list[DeveloperInsightRead]]

    @classmethod
    def from_profile(cls, profile: SessionProfile) -> SessionProfileRead:
        return cls(
            session_id=profile.session_id,
            generated_at=profile.generated_at,
            categories={
                category: [DeveloperInsightRead.from_insight(insight) for insight in insights]
                for category, insights in profile.categories.items()
            },
        )


class SessionInsightsRead(BaseModel):
    """Response shape for GET /sessions/{session_id}/insights — a flattened list."""

    session_id: uuid.UUID
    generated_at: datetime
    insights: list[DeveloperInsightRead]

    @classmethod
    def from_profile(cls, profile: SessionProfile) -> SessionInsightsRead:
        flattened = [
            DeveloperInsightRead.from_insight(insight)
            for insights in profile.categories.values()
            for insight in insights
        ]
        return cls(
            session_id=profile.session_id, generated_at=profile.generated_at, insights=flattened
        )
