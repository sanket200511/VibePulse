"""
AI Engineering Copilot Schemas.

Defines Pydantic models for:
- Deterministic query classification intents
- Fact statements with explicit provenance ([OBSERVED], [INFERRED], [UNKNOWN])
- Normalized CopilotEvidenceContext
- Action recommendations and related entity references
- CopilotQueryRequest and CopilotResponse
- Dynamic, state-driven suggested questions
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

ProvenanceType = Literal["OBSERVED", "INFERRED", "UNKNOWN"]

CopilotIntent = Literal[
    "PROJECT_OVERVIEW",
    "PROJECT_HEALTH",
    "SECURITY",
    "PRIORITY",
    "INCIDENT",
    "INCIDENT_CAUSE",
    "INCIDENT_CRITICALITY",
    "FILE",
    "SUBSYSTEM",
    "PREDICTION",
    "RESOLUTION",
    "KNOWLEDGE_GRAPH",
    "ENGINEERING_ACTIVITY",
    "EVIDENCE",
    "AI_HANDOFF",
    "UNKNOWN",
]


class CopilotFactItem(BaseModel):
    """A granular, verifiable fact with explicit provenance badge."""

    statement: str
    provenance: ProvenanceType = "OBSERVED"
    category: str = "GENERAL"
    source_reference: str | None = None
    confidence_rationale: str | None = None


class EntityReference(BaseModel):
    """Reference to a concrete engineering entity."""

    entity_id: str
    entity_type: Literal[
        "project",
        "subsystem",
        "file",
        "incident",
        "finding",
        "prediction",
        "resolution",
        "session",
        "health_dimension",
    ]
    label: str
    subsystem: str | None = None
    url: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class CopilotRecommendation(BaseModel):
    """An actionable, ranked next step."""

    title: str
    explanation: str
    category: str
    priority: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"] = "MEDIUM"
    action_type: Literal[
        "INVESTIGATE",
        "KNOWLEDGE_GRAPH",
        "REMEDIATE_SECURITY",
        "REVIEW_HOTSPOT",
        "PREVENT_REGRESSION",
        "REVIEW_PRIORITY",
        "MITIGATE_PREDICTION",
    ]
    target_entity: str | None = None
    deep_link_url: str | None = None


class CopilotEvidenceContext(BaseModel):
    """
    Normalized internal evidence package for a query.
    Can be inspected directly, formatted as AI handoff, or serialized for LLM consumption.
    """

    project_id: uuid.UUID
    project_display_name: str
    query: str
    detected_intent: CopilotIntent
    target_entities: list[str] = Field(default_factory=list)
    answerable: bool = True
    answerability_reason: str = "Query is fully grounded in PostgreSQL historical telemetry."
    evidence_strength: Literal["STRONG", "MODERATE", "LOW", "INSUFFICIENT"] = "STRONG"
    observed_facts: list[CopilotFactItem] = Field(default_factory=list)
    inferred_facts: list[CopilotFactItem] = Field(default_factory=list)
    unknowns: list[CopilotFactItem] = Field(default_factory=list)
    relevant_files: list[str] = Field(default_factory=list)
    relevant_subsystems: list[str] = Field(default_factory=list)
    relevant_incidents: list[dict[str, Any]] = Field(default_factory=list)
    relevant_findings: list[dict[str, Any]] = Field(default_factory=list)
    relevant_predictions: list[dict[str, Any]] = Field(default_factory=list)
    relevant_resolutions: list[dict[str, Any]] = Field(default_factory=list)
    relevant_sessions: list[dict[str, Any]] = Field(default_factory=list)
    evidence_references: list[str] = Field(default_factory=list)
    health_summary: dict[str, Any] | None = None
    risk_summary: dict[str, Any] | None = None
    graph_context: dict[str, Any] | None = None
    generated_at: datetime


class CopilotQueryRequest(BaseModel):
    """User query payload."""

    query: str = Field(..., min_length=1, max_length=1000, description="Natural engineering query")
    include_raw_context: bool = False


class CopilotResponse(BaseModel):
    """Structured, evidence-backed answer produced by the Copilot."""

    query: str
    intent: CopilotIntent
    answerable: bool
    answerability_reason: str
    evidence_strength: Literal["STRONG", "MODERATE", "LOW", "INSUFFICIENT"]
    summary: str
    observed: list[CopilotFactItem] = Field(default_factory=list)
    inferred: list[CopilotFactItem] = Field(default_factory=list)
    unknown: list[CopilotFactItem] = Field(default_factory=list)
    recommendations: list[CopilotRecommendation] = Field(default_factory=list)
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    related_entities: list[EntityReference] = Field(default_factory=list)
    next_actions: list[dict[str, str]] = Field(default_factory=list)
    context_package: CopilotEvidenceContext | None = None
    generated_at: datetime


class CopilotSuggestion(BaseModel):
    """State-driven dynamic question suggestion."""

    suggestion_id: str
    category: Literal[
        "HEALTH",
        "SECURITY",
        "INCIDENTS",
        "SUBSYSTEMS",
        "FILES",
        "PREDICTIONS",
        "KNOWLEDGE_GRAPH",
        "GENERAL",
    ]
    question: str
    intent: CopilotIntent | None = None
    rationale: str
    badge: str | None = None
    priority_level: Literal["HIGH", "MEDIUM", "LOW"] = "MEDIUM"
