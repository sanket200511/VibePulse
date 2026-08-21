"""
Engineering Knowledge Graph & Project Memory 2.0 Schemas.

Defines Pydantic models for:
- Semantic graph nodes (Project, Subsystem, File, Technology, SecurityFinding,
  Incident, Prediction, Resolution, Session, HealthDimension)
- Explicit semantic relationships (CONTAINS, BELONGS_TO, MODIFIED_IN,
  ASSOCIATED_WITH, CONTRIBUTED_TO, AFFECTS, RESOLVED_BY, CONTRIBUTES_TO,
  SUPPORTS, USED_BY, DERIVED_FROM)
- File Intelligence & Subsystem Intelligence views
- Incident Relationship views
- Project Memory 2.0 structured AI memory model
- Deterministic multi-entity graph search results
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

ProvenanceType = Literal["OBSERVED", "INFERRED", "UNKNOWN"]

KnowledgeGraphNodeType = Literal[
    "Project",
    "Subsystem",
    "Directory",
    "File",
    "Technology",
    "Framework",
    "SecurityFinding",
    "Incident",
    "Prediction",
    "Resolution",
    "Session",
    "HealthDimension",
    "EngineeringPattern",
]

RelationshipType = Literal[
    "CONTAINS",
    "BELONGS_TO",
    "MODIFIED_IN",
    "ASSOCIATED_WITH",
    "CONTRIBUTED_TO",
    "AFFECTS",
    "RESOLVED_BY",
    "CONTRIBUTES_TO",
    "SUPPORTS",
    "USED_BY",
    "DERIVED_FROM",
]


class KnowledgeGraphNode(BaseModel):
    """A semantic entity in the project knowledge graph."""

    node_id: str
    node_type: KnowledgeGraphNodeType
    project_id: uuid.UUID
    label: str
    subsystem: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    provenance: ProvenanceType = "OBSERVED"


class KnowledgeGraphEdge(BaseModel):
    """An explicit, evidence-backed relationship between two graph entities."""

    relationship_id: str
    source_node_id: str
    target_node_id: str
    relationship_type: RelationshipType
    label: str
    evidence_references: list[str] = Field(default_factory=list)
    provenance: ProvenanceType = "OBSERVED"
    metadata: dict[str, Any] = Field(default_factory=dict)


class ProjectKnowledgeGraph(BaseModel):
    """Complete project knowledge graph projection."""

    project_id: uuid.UUID
    project_display_name: str
    nodes: list[KnowledgeGraphNode] = Field(default_factory=list)
    edges: list[KnowledgeGraphEdge] = Field(default_factory=list)
    node_count_by_type: dict[str, int] = Field(default_factory=dict)
    edge_count_by_type: dict[str, int] = Field(default_factory=dict)
    subsystems: list[str] = Field(default_factory=list)
    total_nodes: int = 0
    total_edges: int = 0
    generated_at: datetime


class FileIntelligenceView(BaseModel):
    """Detailed file-centric knowledge view answering 'What has happened to this file?'"""

    file_path: str
    project_id: uuid.UUID
    subsystem: str
    language: str
    activity_count: int
    first_seen: datetime | None = None
    last_modified: datetime | None = None
    findings_count: int = 0
    findings: list[dict[str, Any]] = Field(default_factory=list)
    incidents_count: int = 0
    incidents: list[dict[str, Any]] = Field(default_factory=list)
    predictions_count: int = 0
    predictions: list[dict[str, Any]] = Field(default_factory=list)
    sessions_count: int = 0
    session_ids: list[str] = Field(default_factory=list)
    related_nodes: list[KnowledgeGraphNode] = Field(default_factory=list)
    provenance: ProvenanceType = "OBSERVED"


class SubsystemIntelligenceView(BaseModel):
    """Subsystem-centric view answering 'Which part of the project is under pressure?'"""

    subsystem_name: str
    project_id: uuid.UUID
    file_count: int
    activity_count: int
    findings_count: int
    open_incidents_count: int
    resolved_incidents_count: int
    forecast_signals_count: int
    risk_score: int
    health_status: str
    files: list[str] = Field(default_factory=list)
    active_findings: list[dict[str, Any]] = Field(default_factory=list)
    active_incidents: list[dict[str, Any]] = Field(default_factory=list)
    forecast_signals: list[dict[str, Any]] = Field(default_factory=list)
    provenance: ProvenanceType = "OBSERVED"


class IncidentRelationshipView(BaseModel):
    """Incident-centric relationship view."""

    incident_id: str
    project_id: uuid.UUID
    title: str
    severity: str
    status: str
    affected_files: list[str] = Field(default_factory=list)
    affected_subsystems: list[str] = Field(default_factory=list)
    findings: list[dict[str, Any]] = Field(default_factory=list)
    sessions: list[str] = Field(default_factory=list)
    resolutions: list[dict[str, Any]] = Field(default_factory=list)
    health_impact: str
    provenance: ProvenanceType = "OBSERVED"


class ProjectMemory2(BaseModel):
    """Structured AI memory model."""

    project_id: uuid.UUID
    project_display_name: str
    root_path: str
    languages: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)
    frameworks: list[str] = Field(default_factory=list)
    important_files: list[str] = Field(default_factory=list)
    subsystems: list[str] = Field(default_factory=list)
    current_focus: str
    overall_health_score: int | None = None
    health_grade: str
    active_incidents_count: int = 0
    resolved_incidents_count: int = 0
    recurring_findings_count: int = 0
    recurring_rules: list[str] = Field(default_factory=list)
    active_forecasts_count: int = 0
    top_priorities: list[dict[str, Any]] = Field(default_factory=list)
    known_relationships_count: int = 0
    known_unknowns: list[str] = Field(default_factory=list)
    provenance: ProvenanceType = "OBSERVED"
    generated_at: datetime


class GraphSearchResult(BaseModel):
    """Deterministic entity search result."""

    entity_id: str
    entity_type: KnowledgeGraphNodeType
    label: str
    subsystem: str | None = None
    match_reason: str
    score: int
    provenance: ProvenanceType = "OBSERVED"
