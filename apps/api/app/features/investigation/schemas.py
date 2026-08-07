"""
Investigation schemas.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class InvestigationArchitectureChange(BaseModel):
    kind: str
    symbol: str


class InvestigationSecurityFinding(BaseModel):
    rule_id: str
    severity: str
    message: str


class InvestigationAIEvent(BaseModel):
    provider: str
    model: str
    interaction_type: str | None


class InvestigationResult(BaseModel):
    """
    Canonical model returned by every investigation endpoint.
    Unused fields remain null.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    timestamp: datetime
    project_root: str
    session_id: uuid.UUID
    file_path: str | None
    language: str | None
    event_type: str

    summary: str  # Short description of what happened

    # Enriched fields based on subsequent analysis or event types
    architecture_changes: list[InvestigationArchitectureChange] = Field(default_factory=list)
    security_findings: list[InvestigationSecurityFinding] = Field(default_factory=list)
    ai_event: InvestigationAIEvent | None = None

    replay_link: str | None = None
    timeline_position: int | None = None


class InvestigationResponse(BaseModel):
    results: list[InvestigationResult]
    total_count: int
    has_more: bool


class FilterOptions(BaseModel):
    projects: list[str]
    sessions: list[str]
    languages: list[str]
    event_types: list[str]
    severities: list[str]
    ai_providers: list[str]
