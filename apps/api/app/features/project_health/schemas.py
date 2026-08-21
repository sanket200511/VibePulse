"""
Unified Project Health & Intelligence Orchestrator Schemas.

Defines Pydantic models for the 5-dimensional deterministic health model,
evidence provenance, and the 'What Should I Do Next?' priority engine.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class HealthDimension(BaseModel):
    """A single deterministic health dimension (positive score: 0 = critical, 100 = excellent)."""

    name: str
    dimension_key: Literal[
        "security_health",
        "engineering_stability",
        "incident_health",
        "resolution_health",
        "predictive_risk_health",
    ]
    score: int = Field(ge=0, le=100, description="Normalized score: 100=optimal, 0=critical")
    status: Literal["OPTIMAL", "STABLE", "NEEDS_ATTENTION", "DEGRADED", "CRITICAL", "UNKNOWN"]
    weight: float = Field(ge=0.0, le=1.0)
    contributing_signals: list[str] = Field(default_factory=list)
    explanation: str
    provenance: Literal["OBSERVED", "INFERRED", "UNKNOWN"] = "OBSERVED"


class ProjectPriorityItem(BaseModel):
    """
    A ranked, evidence-backed priority item answering 'What Should I Do Next?'.
    Synthesized deterministically from existing incidents, findings, regressions, and forecasts.
    """

    priority_id: str
    rank: int = Field(ge=1, description="Deterministic 1-indexed rank")
    category: Literal[
        "REGRESSION_ALERT",
        "CRITICAL_INCIDENT",
        "SECURITY_REMEDIATION",
        "HOTSPOT_REVIEW",
        "PREDICTIVE_PREVENTION",
    ]
    title: str
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    priority_score: int = Field(ge=0, le=100, description="Priority urgency score used for sorting")
    why_ranked_highly: str
    contributing_evidence: list[str] = Field(default_factory=list)
    affected_files: list[str] = Field(default_factory=list)
    affected_subsystem: str = "Core Application"
    recommended_action: str
    deep_link_url: str | None = None
    provenance: Literal["OBSERVED", "INFERRED", "UNKNOWN"] = "OBSERVED"


class UnifiedProjectHealth(BaseModel):
    """
    Top-level synthesized Project Health and Actionable Priorities model.
    100% deterministically composed from existing canonical projections.
    """

    project_id: uuid.UUID
    project_display_name: str
    overall_health_score: int | None = Field(
        None, ge=0, le=100, description="Composite health score (0-100), null if insufficient data"
    )
    grade: Literal[
        "EXCELLENT", "HEALTHY", "NEEDS_ATTENTION", "DEGRADED", "CRITICAL", "INSUFFICIENT_EVIDENCE"
    ]
    status: Literal["READY", "INSUFFICIENT_EVIDENCE"]
    status_message: str

    # Five canonical dimensions
    security_health: HealthDimension
    engineering_stability: HealthDimension
    incident_health: HealthDimension
    resolution_health: HealthDimension
    predictive_risk_health: HealthDimension

    # Actionable Priority Engine
    top_priorities: list[ProjectPriorityItem] = Field(default_factory=list)

    # Operational metrics summary (reused canonical data)
    open_incidents_count: int = 0
    resolved_incidents_count: int = 0
    active_security_findings_count: int = 0
    active_hotspots_count: int = 0
    active_forecasts_count: int = 0

    generated_at: datetime
