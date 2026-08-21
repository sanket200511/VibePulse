export type ProvenanceType = "OBSERVED" | "INFERRED" | "UNKNOWN";

export type KnowledgeGraphNodeType =
  | "Project"
  | "Subsystem"
  | "Directory"
  | "File"
  | "Technology"
  | "Framework"
  | "SecurityFinding"
  | "Incident"
  | "Prediction"
  | "Resolution"
  | "Session"
  | "HealthDimension"
  | "EngineeringPattern";

export type RelationshipType =
  | "CONTAINS"
  | "BELONGS_TO"
  | "MODIFIED_IN"
  | "ASSOCIATED_WITH"
  | "CONTRIBUTED_TO"
  | "AFFECTS"
  | "RESOLVED_BY"
  | "CONTRIBUTES_TO"
  | "SUPPORTS"
  | "USED_BY"
  | "DERIVED_FROM";

export interface KnowledgeGraphNode {
  node_id: string;
  node_type: KnowledgeGraphNodeType;
  project_id: string;
  label: string;
  subsystem?: string | null;
  metadata: Record<string, unknown>;
  provenance: ProvenanceType;
}

export interface KnowledgeGraphEdge {
  relationship_id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: RelationshipType;
  label: string;
  evidence_references: string[];
  provenance: ProvenanceType;
  metadata: Record<string, unknown>;
}

export interface ProjectKnowledgeGraph {
  project_id: string;
  project_display_name: string;
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  node_count_by_type: Record<string, number>;
  edge_count_by_type: Record<string, number>;
  subsystems: string[];
  total_nodes: number;
  total_edges: number;
  generated_at: string;
}

export interface FileIntelligenceView {
  file_path: string;
  project_id: string;
  subsystem: string;
  language: string;
  activity_count: number;
  first_seen?: string | null;
  last_modified?: string | null;
  findings_count: number;
  findings: Record<string, unknown>[];
  incidents_count: number;
  incidents: Record<string, unknown>[];
  predictions_count: number;
  predictions: Record<string, unknown>[];
  sessions_count: number;
  session_ids: string[];
  related_nodes: KnowledgeGraphNode[];
  provenance: ProvenanceType;
}

export interface SubsystemIntelligenceView {
  subsystem_name: string;
  project_id: string;
  file_count: number;
  activity_count: number;
  findings_count: number;
  open_incidents_count: number;
  resolved_incidents_count: number;
  forecast_signals_count: number;
  risk_score: number;
  health_status: string;
  files: string[];
  active_findings: Record<string, unknown>[];
  active_incidents: Record<string, unknown>[];
  forecast_signals: Record<string, unknown>[];
  provenance: ProvenanceType;
}

export interface GraphSearchResult {
  entity_id: string;
  entity_type: KnowledgeGraphNodeType;
  label: string;
  subsystem?: string | null;
  match_reason: string;
  score: number;
  provenance: ProvenanceType;
}
