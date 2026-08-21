"""
Universal Evidence & Explainability Schemas.

Defines Pydantic models for:
- Granular EvidenceItems with provenance tags (OBSERVED, INFERRED, UNKNOWN)
- Causal Evidence Chains connecting raw events to final conclusions
- Mathematical Score Decompositions
- Unified EntityExplainabilityResponse answering "WHY DOES VIBEPULSE BELIEVE THIS?"
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ProvenanceType = Literal["OBSERVED", "INFERRED", "UNKNOWN"]
EntityType = Literal["health", "security", "incident", "prediction", "priority"]


class EvidenceItem(BaseModel):
    """
    Granular, evidence-grounded item linking a fact or inference to its canonical source.
    """

    evidence_id: str
    project_id: uuid.UUID
    timestamp: datetime
    source_type: Literal[
        "DEVELOPMENT_EVENT",
        "SECURITY_ANALYSIS",
        "INCIDENT_REVIEW",
        "HOTSPOT_METRIC",
        "PREDICTIVE_SIGNAL",
        "DIMENSION_HEALTH",
    ]
    source_id: str | None = None
    event_id: uuid.UUID | None = None
    session_id: uuid.UUID | None = None
    file_path: str | None = None
    subsystem: str | None = None
    rule_id: str | None = None
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] | None = None
    title: str
    observed_value: str | None = None
    derived_value: str | None = None
    provenance: ProvenanceType = "OBSERVED"
    explanation: str
    redacted_evidence: str | None = None
    related_entities: list[dict[str, str]] = Field(default_factory=list)


class EvidenceChainStep(BaseModel):
    """
    A single node in a causal evidence chain representing pipeline progression.
    """

    step_number: int
    stage: Literal[
        "OBSERVE",
        "DETECT",
        "INVESTIGATE",
        "RESOLVE",
        "LEARN",
        "ANTICIPATE",
        "HEALTH",
        "PRIORITY",
    ]
    title: str
    description: str
    provenance: ProvenanceType = "OBSERVED"
    evidence_item: EvidenceItem | None = None
    entity_link: str | None = None


class ScoreDecompositionItem(BaseModel):
    """
    Mathematical decomposition of a composite score dimension.
    """

    dimension_name: str
    dimension_key: str
    raw_score: int
    weight: float
    weighted_contribution: float
    explanation: str
    contributing_signals: list[str] = Field(default_factory=list)
    provenance: ProvenanceType = "OBSERVED"


class EntityExplainabilityResponse(BaseModel):
    """
    Comprehensive explainability response answering "WHY DOES VIBEPULSE BELIEVE THIS?"
    for any core intelligence entity (health, security, incident, prediction, priority).
    """

    entity_type: EntityType
    entity_id: str
    project_id: uuid.UUID
    title: str
    summary: str
    why_explanation: str
    score: int | float | None = None
    score_decomposition: list[ScoreDecompositionItem] = Field(default_factory=list)
    evidence_chain: list[EvidenceChainStep] = Field(default_factory=list)
    evidence_items: list[EvidenceItem] = Field(default_factory=list)
    contributing_signals: list[str] = Field(default_factory=list)
    provenance: ProvenanceType = "OBSERVED"
    remediation: str | None = None
    redaction_verified: bool = True
    generated_at: datetime
