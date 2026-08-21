"""
Predictive Engineering Intelligence Schemas.

Defines Pydantic models for evidence-backed forecasts, additive score breakdowns,
hotspot rankings, engineering focus drift, and historical trend series.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ScoreBreakdown(BaseModel):
    """Additive components explaining the Forecast Strength score (0-100)."""

    activity_acceleration: int = 0
    security_recurrence: int = 0
    hotspot_concentration: int = 0
    sensitive_surface_touch: int = 0
    resolution_regression: int = 0
    trend_persistence: int = 0
    explanation: list[str] = Field(default_factory=list)


class PredictiveSignal(BaseModel):
    """
    An evidence-backed forecast signal.
    Represents historical pattern projection, NOT artificial ML confidence or probability.
    """

    prediction_id: str = Field(default_factory=lambda: f"pred-{uuid.uuid4().hex[:10]}")
    project_id: uuid.UUID
    prediction_type: Literal[
        "SECURITY_RECURRENCE",
        "ENGINEERING_HOTSPOT",
        "CHANGE_BURST",
        "INCIDENT_RECURRENCE",
        "RESOLUTION_REGRESSION",
        "FOCUS_DRIFT",
        "SURFACE_EXPANSION",
    ]
    title: str
    summary: str
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    forecast_score: int = Field(
        ge=0,
        le=100,
        description="Additive strength of historical evidence supporting this forecast.",
    )
    evidence_strength: Literal["STRONG", "MODERATE", "LOW", "INSUFFICIENT"]
    time_horizon: Literal["IMMEDIATE", "SHORT_TERM", "MEDIUM_TERM"]
    contributing_signals: list[str] = Field(default_factory=list)
    score_breakdown: ScoreBreakdown
    affected_files: list[str] = Field(default_factory=list)
    affected_subsystems: list[str] = Field(default_factory=list)
    historical_window_days: int = 14
    recommended_action: str
    investigation_incident_id: str | None = None
    provenance: Literal["OBSERVED", "INFERRED", "UNKNOWN"] = "OBSERVED"
    created_at: datetime


class HotspotItem(BaseModel):
    """A subsystem or file hotspot identified from change volume and security findings."""

    subsystem: str
    file_path: str
    hotspot_score: int = Field(ge=0, le=100)
    activity_count: int = 0
    findings_count: int = 0
    incident_count: int = 0
    trend: Literal["ACCELERATING", "STABLE", "DECELERATING"] = "STABLE"
    recent_burst_events: int = 0
    explanation: str


class PredictiveTrendPoint(BaseModel):
    """A chronological time-series point for historical trend analysis."""

    date_label: str
    event_count: int = 0
    finding_count: int = 0
    incident_count: int = 0
    resolved_count: int = 0


class EngineeringDriftSummary(BaseModel):
    """Observable evolution of engineering focus over time."""

    previous_focus: str
    current_focus: str
    emerging_focus: str
    drift_explanation: str
    provenance: Literal["OBSERVED", "INFERRED", "UNKNOWN"] = "OBSERVED"


class RecurringRiskItem(BaseModel):
    """A recurring security rule or pattern with historical occurrences."""

    rule_id: str
    title: str
    occurrence_count: int
    first_seen: datetime | None = None
    last_seen: datetime | None = None
    affected_files: list[str] = Field(default_factory=list)
    trend: Literal["INCREASING", "PERSISTENT", "RESOLVING"] = "PERSISTENT"
    investigation_incident_id: str | None = None


class PredictiveSummary(BaseModel):
    """Top-level summary of predictive engineering posture and forecasts."""

    project_id: uuid.UUID
    project_display_name: str
    status: Literal["READY", "INSUFFICIENT_EVIDENCE"]
    status_message: str
    total_predictions: int
    critical_count: int
    high_count: int
    active_hotspots_count: int
    recurring_risks_count: int
    engineering_drift: EngineeringDriftSummary
    forecast_signals: list[PredictiveSignal] = Field(default_factory=list)
    hotspots: list[HotspotItem] = Field(default_factory=list)
    recurring_risks: list[RecurringRiskItem] = Field(default_factory=list)
    trends: list[PredictiveTrendPoint] = Field(default_factory=list)
    generated_at: datetime
