export type ProvenanceType = "OBSERVED" | "INFERRED" | "UNKNOWN";

export type KnowledgeGraphNodeType =
  | "Project"
  | "Subsystem"
  | "Directory"
  | "File"
  | "DevelopmentEvent"
  | "SecurityFinding"
  | "Incident"
  | "RootCause"
  | "Investigation"
  | "HealthDimension"
  | "Resolution"
  | "Prediction"
  | "ProjectContext"
  | "Actor"
  | "Technology"
  | "Framework"
  | "EngineeringPattern";

export type RelationshipType =
  | "CONTAINS"
  | "BELONGS_TO"
  | "MODIFIED_IN"
  | "MODIFIED"
  | "OBSERVED_IN"
  | "CONTAINS_FINDING"
  | "ASSOCIATED_WITH"
  | "CAUSED"
  | "CONTRIBUTED_TO"
  | "CORRELATED_WITH"
  | "CONTRIBUTES_TO"
  | "AFFECTS"
  | "INVESTIGATED_BY"
  | "RESOLVED_BY"
  | "RESOLVED"
  | "PREDICTED_AS"
  | "SUPPORTS"
  | "USED_BY"
  | "DERIVED_FROM"
  | "PART_OF"
  | "REFERENCES";

export type GraphMode = "RELATIONSHIP" | "INVESTIGATION" | "IMPACT" | "MEMORY";

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
  reason?: string;
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

export interface GraphEdgeExplanation {
  relationship_id: string;
  source_node_id: string;
  source_label: string;
  source_type: string;
  target_node_id: string;
  target_label: string;
  target_type: string;
  relationship_type: RelationshipType;
  label: string;
  reason: string;
  evidence_references: string[];
  evidence_details: Array<Record<string, unknown>>;
  health_impact?: string | null;
  is_grounded: boolean;
  provenance: ProvenanceType;
}

export interface GraphTraversalStep {
  step_index: number;
  node_id: string;
  node_type: string;
  label: string;
  subsystem?: string | null;
  relationship_type?: string | null;
  direction: "FORWARD" | "BACKWARD" | "START";
  explanation: string;
  evidence: string[];
  metadata: Record<string, unknown>;
}

export interface GraphTraversalResponse {
  mode: "ROOT_CAUSE" | "IMPACT";
  starting_node_id: string;
  starting_label: string;
  target_node_id?: string | null;
  steps: GraphTraversalStep[];
  path_summary: string;
  is_complete: boolean;
  stopping_reason: string;
  affected_subsystems: string[];
  total_steps: number;
}

export interface GraphTimelineEvent {
  id: string;
  timestamp: string;
  event_type: string;
  label: string;
  entity_id: string;
  entity_type: string;
  subsystem?: string | null;
  details: Record<string, unknown>;
  provenance: ProvenanceType;
}

export interface GraphTimelineResponse {
  project_id: string;
  events: GraphTimelineEvent[];
  total_events: number;
}

export interface BeforeAfterComparisonResponse {
  project_id: string;
  before_nodes: KnowledgeGraphNode[];
  before_edges: KnowledgeGraphEdge[];
  after_nodes: KnowledgeGraphNode[];
  after_edges: KnowledgeGraphEdge[];
  resolved_incidents_count: number;
  resolved_findings_count: number;
  remediation_summary: string;
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

export interface IncidentRelationshipView {
  incident_id: string;
  project_id: string;
  title: string;
  severity: string;
  status: string;
  affected_files: string[];
  affected_subsystems: string[];
  findings: Record<string, unknown>[];
  sessions: string[];
  resolutions: Record<string, unknown>[];
  health_impact: string;
  provenance: ProvenanceType;
}

export interface ProjectMemory2 {
  project_id: string;
  project_display_name: string;
  root_path: string;
  languages: string[];
  technologies: string[];
  frameworks: string[];
  important_files: string[];
  subsystems: string[];
  current_focus: string;
  overall_health_score: number | null;
  health_grade: string;
  active_incidents_count: number;
  resolved_incidents_count: number;
  recurring_findings_count: number;
  recurring_rules: string[];
  active_forecasts_count: number;
  top_priorities: Record<string, unknown>[];
  known_relationships_count: number;
  known_unknowns: string[];
  provenance: ProvenanceType;
  generated_at: string;
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
