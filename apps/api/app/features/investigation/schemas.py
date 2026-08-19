"""
Investigation schemas.
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
    kind: str  # "FILE_CHANGE" | "PATTERN_MATCH" | "CORRELATION" | "RISK_ESCALATION"
    severity: str | None = None
    file: str | None = None


class EvidenceNode(BaseModel):
    id: str
    step_number: int
    title: str
    subtitle: str
    kind: str  # e.g. "SESSION_START" | "FILE_CHANGE" | "PATTERN_MATCH" | "RISK_ESCALATION"
    timestamp: datetime
    severity: str | None = None
    file: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class InvestigationResult(BaseModel):
    """
    Canonical model returned by every investigation endpoint.
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

    summary: str  # Short description of what happened
    risk_score: int = 0
    risk_level: str = "LOW"
    risk_factors: list[RiskFactor] = Field(default_factory=list)
    evidence_chain: list[EvidenceStep] = Field(default_factory=list)
    evidence_nodes: list[EvidenceNode] = Field(default_factory=list)
    affected_files: list[str] = Field(default_factory=list)
    correlated_events_count: int = 1
    recommendation: str | None = None

    # Enriched fields based on subsequent analysis or event types
    architecture_changes: list[InvestigationArchitectureChange] = Field(
        default_factory=list
    )
    security_findings: list[InvestigationSecurityFinding] = Field(
        default_factory=list
    )
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
