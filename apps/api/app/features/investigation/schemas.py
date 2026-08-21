"""
Investigation Engine 3.0 + Collaboration & Resolution Intelligence Schemas.

Defines unified incident intelligence domain models:
- IncidentStory: narrative derived from real telemetry
- TimelineStep3: granular, timestamp-backed event sequence
- RiskEvolution: step-by-step point progression
- RootCauseAnalysis: primary and contributing signals
- EngineeringDNACorrelation: contrast against normal development focus
- AffectedSurfaceSummary: grouped subsystem distribution
- EvidenceGraph3: typed nodes and explainable causal edges
- ResolutionRecommendation: deterministic rule-based remediation guidance
- IncidentReviewHistoryItem: audit trail entries
- IncidentMetrics: resolution velocity and rate
- ProjectHealthSummary: unified posture and incident health
- InvestigationIncidentDetail: unified incident payload
- IncidentReviewRequest: user review lifecycle transitions
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class InvestigationArchitectureChange(BaseModel):
    kind: str
    symbol: str


class InvestigationSecurityFinding(BaseModel):
    rule_id: str
    severity: str
    message: str
    file: str | None = None
    line_number: int | None = None
    redacted_evidence: str | None = None
    category: str | None = None
    recommendation: str | None = None
    risk_contribution: int = 10
    provenance: str = "OBSERVED"


class InvestigationAIEvent(BaseModel):
    provider: str
    model: str
    interaction_type: str | None


class RiskFactor(BaseModel):
    label: str
    score: int
    category: str


class EvidenceStep(BaseModel):
    timestamp: datetime
    title: str
    description: str
    kind: str
    severity: str | None = None
    file: str | None = None


class EvidenceNode(BaseModel):
    id: str
    step_number: int
    title: str
    subtitle: str
    kind: str  # "SESSION", "FILE_CHANGE", "SECURITY_FINDING", "RISK_CHANGE", etc.
    timestamp: datetime
    severity: str | None = None
    file: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    provenance: str = "OBSERVED"


class EvidenceGraphEdge3(BaseModel):
    source_id: str
    target_id: str
    relationship_label: str


class EvidenceGraph3(BaseModel):
    nodes: list[EvidenceNode] = Field(default_factory=list)
    edges: list[EvidenceGraphEdge3] = Field(default_factory=list)


class IncidentStory(BaseModel):
    title: str
    summary: str
    narrative_paragraphs: list[str] = Field(default_factory=list)
    provenance: str = "OBSERVED"


class TimelineStep3(BaseModel):
    timestamp: datetime
    event_id: uuid.UUID | str
    event_type: str
    file_path: str | None = None
    session_id: uuid.UUID | str | None = None
    security_finding: str | None = None
    risk_change: str | None = None
    description: str
    provenance: str = "OBSERVED"


class RiskEvolutionStep(BaseModel):
    timestamp: datetime | None = None
    factor: str
    points_added: int
    running_score: int
    category: str


class RiskEvolution(BaseModel):
    initial_score: int = 0
    final_score: int = 0
    risk_level: str = "LOW"
    steps: list[RiskEvolutionStep] = Field(default_factory=list)


class RootCauseAnalysis(BaseModel):
    primary_signal: str
    contributing_signals: list[str] = Field(default_factory=list)
    assessment: str
    provenance: str = "OBSERVED"  # "OBSERVED" | "INFERRED" | "UNKNOWN"


class EngineeringDNACorrelation(BaseModel):
    normal_focus_dirs: list[str] = Field(default_factory=list)
    incident_surface_files: list[str] = Field(default_factory=list)
    is_surface_deviation: bool = False
    analysis_summary: str
    provenance: str = "OBSERVED"  # "OBSERVED" | "INFERRED"


class AffectedSurfaceItem(BaseModel):
    subsystem: str  # "Authentication", "Configuration", "Database", etc.
    file_count: int
    files: list[str] = Field(default_factory=list)
    findings_count: int = 0


class AffectedSurfaceSummary(BaseModel):
    breakdown: list[AffectedSurfaceItem] = Field(default_factory=list)
    most_affected_file: str | None = None
    total_findings: int = 0


class ResolutionRecommendation(BaseModel):
    """
    Deterministic rule-backed remediation guidance for an observed security finding.
    """

    rule_id: str
    title: str
    why: str
    recommended_actions: list[str] = Field(default_factory=list)
    verification_steps: list[str] = Field(default_factory=list)


class IncidentReviewHistoryItem(BaseModel):
    """
    Durable history item representing a review state transition.
    """

    id: uuid.UUID
    incident_id: str
    previous_status: str
    new_status: str
    resolution_note: str | None = None
    reviewer: str = "Local Developer"
    created_at: datetime


class IncidentReviewHistoryResponse(BaseModel):
    incident_id: str
    current_status: str
    history: list[IncidentReviewHistoryItem] = Field(default_factory=list)


class IncidentMetrics(BaseModel):
    """
    Real evidence-derived incident metrics.
    """

    project_id: uuid.UUID
    open_incidents: int = 0
    investigating_incidents: int = 0
    resolved_incidents: int = 0
    total_incidents: int = 0
    total_transitions: int = 0
    resolution_rate_percent: float | None = None
    avg_resolution_time_seconds: float | None = None
    status_note: str = "Calculated from PostgreSQL audit history"


class ProjectHealthSummary(BaseModel):
    """
    Unified project health summary derived from PostgreSQL telemetry.
    """

    project_id: uuid.UUID
    project_display_name: str
    security_posture: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW", "CLEAN"
    risk_score: int
    open_incidents: int
    resolved_incidents: int
    recent_incident_activity: int
    most_affected_subsystem: str
    recurring_rule: str | None = None
    total_events: int


class IncidentReviewRecord(BaseModel):
    status: str = "OPEN"  # "OPEN" | "INVESTIGATING" | "REVIEWED" | "RESOLVED"
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    resolution_note: str | None = None
    resolved_at: datetime | None = None
    updated_at: datetime | None = None


class IncidentReviewRequest(BaseModel):
    status: str = Field(..., description="Target status: INVESTIGATING, REVIEWED, or RESOLVED")
    reviewed_by: str | None = Field(default="Local Developer")
    resolution_note: str | None = Field(default=None)


class InvestigationIncidentDetail(BaseModel):
    """
    Unified incident investigation model answering WHAT, WHEN, WHERE, WHO, WHY, RELATED.
    """

    model_config = ConfigDict(from_attributes=True)

    investigation_id: str
    project_id: uuid.UUID
    project_display_name: str
    incident_id: str
    title: str
    summary: str
    status: str = "OPEN"  # "OPEN" | "INVESTIGATING" | "REVIEWED" | "RESOLVED"
    severity: str  # "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    risk_score: int
    confidence: str = "OBSERVED"
    started_at: datetime
    detected_at: datetime
    last_activity_at: datetime
    session_ids: list[uuid.UUID | str] = Field(default_factory=list)
    affected_files: list[str] = Field(default_factory=list)
    related_events_count: int = 0
    security_findings: list[InvestigationSecurityFinding] = Field(default_factory=list)

    # Narrative & Intelligence layers
    story: IncidentStory
    timeline: list[TimelineStep3] = Field(default_factory=list)
    risk_evolution: RiskEvolution
    root_cause: RootCauseAnalysis
    engineering_dna: EngineeringDNACorrelation
    affected_surface: AffectedSurfaceSummary
    evidence_graph: EvidenceGraph3
    remediation_steps: list[str] = Field(default_factory=list)
    remediation_guidance: str

    # Collaboration & Resolution Intelligence
    resolution_recommendations: list[ResolutionRecommendation] = Field(default_factory=list)
    review_record: IncidentReviewRecord
    review_history: list[IncidentReviewHistoryItem] = Field(default_factory=list)

    # Metadata
    created_at: datetime
    updated_at: datetime


class InvestigationResult(BaseModel):
    """
    Canonical summary model returned by investigation search endpoints.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    timestamp: datetime
    project_root: str
    project_name: str | None = None
    session_id: uuid.UUID
    file_path: str | None = None
    file_name: str | None = None
    language: str | None = None
    event_type: str

    summary: str
    risk_score: int = 0
    risk_level: str = "LOW"
    status: str = "OPEN"
    risk_factors: list[RiskFactor] = Field(default_factory=list)
    evidence_chain: list[EvidenceStep] = Field(default_factory=list)
    evidence_nodes: list[EvidenceNode] = Field(default_factory=list)
    affected_files: list[str] = Field(default_factory=list)
    correlated_events_count: int = 1
    recommendation: str | None = None

    architecture_changes: list[InvestigationArchitectureChange] = Field(default_factory=list)
    security_findings: list[InvestigationSecurityFinding] = Field(default_factory=list)
    ai_event: InvestigationAIEvent | None = None

    replay_link: str | None = None
    timeline_position: int | None = None


class InvestigationResponse(BaseModel):
    results: list[InvestigationResult]
    total_count: int
    security_findings_count: int = 0
    critical_count: int = 0
    suspicious_count: int = 0
    high_risk_count: int = 0
    sessions_count: int = 0
    projects_count: int = 0
    has_more: bool


class FilterOptions(BaseModel):
    projects: list[str]
    sessions: list[str]
    languages: list[str]
    event_types: list[str]
    severities: list[str]
    ai_providers: list[str]


class InvestigationExportResponse(BaseModel):
    investigation_id: str
    incident_id: str
    format: str
    content: str
