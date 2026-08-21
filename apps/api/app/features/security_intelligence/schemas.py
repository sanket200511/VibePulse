"""
Security Intelligence 2.0 Schemas.

Defines the typed Pydantic models for Security Posture, Findings,
Sensitive Files, Dependency Inventory, Correlated Incidents, and Risk Explanations.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class SecurityPosture(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    sensitive_files_count: int = 0
    security_events_count: int = 0
    open_findings_count: int = 0


class SecurityFinding(BaseModel):
    finding_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    rule_id: str
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    title: str
    description: str
    category: str = "Secrets"
    project_id: uuid.UUID | None = None
    file_path: str
    line_number: int | None = None
    evidence: str
    redacted_evidence: str
    detected_at: datetime
    status: Literal["OPEN", "RESOLVED", "MUTED"] = "OPEN"
    provenance: Literal["OBSERVED", "INFERRED", "UNKNOWN"] = "OBSERVED"
    what: str | None = None
    why: str | None = None
    where: str | None = None
    remediation: str
    risk_contribution: int = 10


class SensitiveFileDetail(BaseModel):
    file_path: str
    role: str
    activity_count: int = 0
    last_modified: datetime | None = None
    findings_count: int = 0
    findings: list[str] = Field(default_factory=list)


class AuthenticationSignalDetail(BaseModel):
    signal_name: str
    classification: Literal["OBSERVED", "INFERRED", "UNKNOWN"] = "OBSERVED"
    evidence: str
    evidence_files: list[str] = Field(default_factory=list)
    confidence_reason: str = "Detected from authentication routines and dependency manifests"


class ConfigurationRiskDetail(BaseModel):
    title: str
    file_path: str
    evidence: str
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"] = "MEDIUM"
    classification: Literal["OBSERVED", "INFERRED", "UNKNOWN"] = "OBSERVED"
    remediation: str


class DependencyInventory(BaseModel):
    direct_count: int = 0
    dev_count: int = 0
    total_count: int = 0
    manifest_files: list[str] = Field(default_factory=list)
    vulnerability_intelligence_status: str = "Vulnerability intelligence not configured."


class SecurityActivitySummary(BaseModel):
    credential_exposure_count: int = 0
    auth_changes_count: int = 0
    config_changes_count: int = 0
    analyzer_alerts_count: int = 0
    window_days: int = 7


class SecurityTrendPoint(BaseModel):
    date_label: str
    event_count: int = 0
    finding_count: int = 0


class CorrelatedSecurityIncident(BaseModel):
    incident_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    title: str
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    risk_score: int
    session_id: uuid.UUID | None = None
    affected_files: list[str] = Field(default_factory=list)
    event_count: int = 1
    first_event_at: datetime
    latest_event_at: datetime
    contributing_findings: list[SecurityFinding] = Field(default_factory=list)
    evidence_summary: list[str] = Field(default_factory=list)


class RiskScoreBreakdownItem(BaseModel):
    factor: str
    points: int
    category: str


class RiskScoreExplanation(BaseModel):
    total_score: int = 0
    risk_level: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"] = "LOW"
    breakdown: list[RiskScoreBreakdownItem] = Field(default_factory=list)


class SecurityIntelligenceRead(BaseModel):
    project_id: uuid.UUID
    project_display_name: str
    project_root_path: str
    security_posture: SecurityPosture
    security_findings: list[SecurityFinding] = Field(default_factory=list)
    sensitive_files: list[SensitiveFileDetail] = Field(default_factory=list)
    authentication_signals: list[AuthenticationSignalDetail] = Field(default_factory=list)
    configuration_risks: list[ConfigurationRiskDetail] = Field(default_factory=list)
    dependency_inventory: DependencyInventory
    security_activity: SecurityActivitySummary
    security_trend: list[SecurityTrendPoint] = Field(default_factory=list)
    correlated_incidents: list[CorrelatedSecurityIncident] = Field(default_factory=list)
    risk_explanation: RiskScoreExplanation
    analysis_version: int = 2
    last_analyzed_at: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)
