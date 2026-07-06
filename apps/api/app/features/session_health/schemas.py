"""
Session Health response schemas — wire shapes for GET /sessions/{session_id}/health.

Mirrors the DeveloperInsight headline/evidence/metrics split from
insights/schemas.py, plus ``label`` for Health's categorical verdict.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.features.session_health.domain import (
    HealthCategory,
    HealthMetric,
    HealthReport,
    HealthSummary,
)


class HealthMetricRead(BaseModel):
    id: uuid.UUID
    category: HealthCategory
    generator_name: str
    generator_version: int
    label: str
    headline: str
    evidence: str | None
    metrics: dict[str, Any]

    @classmethod
    def from_metric(cls, metric: HealthMetric) -> HealthMetricRead:
        return cls(
            id=metric.id,
            category=metric.category,
            generator_name=metric.generator_name,
            generator_version=metric.generator_version,
            label=metric.label,
            headline=metric.headline,
            evidence=metric.evidence,
            metrics=metric.metrics,
        )


class HealthSummaryRead(BaseModel):
    narrative: str
    guidance: list[str]

    @classmethod
    def from_summary(cls, summary: HealthSummary) -> HealthSummaryRead:
        return cls(narrative=summary.narrative, guidance=summary.guidance)


class HealthReportRead(BaseModel):
    """Response shape for GET /sessions/{session_id}/health."""

    session_id: uuid.UUID
    generated_at: datetime
    metrics: dict[HealthCategory, HealthMetricRead]
    summary: HealthSummaryRead

    @classmethod
    def from_report(cls, report: HealthReport) -> HealthReportRead:
        return cls(
            session_id=report.session_id,
            generated_at=report.generated_at,
            metrics={
                category: HealthMetricRead.from_metric(metric)
                for category, metric in report.metrics.items()
            },
            summary=HealthSummaryRead.from_summary(report.summary),
        )
