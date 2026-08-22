export type ProvenanceType = "OBSERVED" | "INFERRED" | "UNKNOWN";

export type CopilotIntent =
  | "PROJECT_OVERVIEW"
  | "PROJECT_HEALTH"
  | "SECURITY"
  | "PRIORITY"
  | "INCIDENT"
  | "INCIDENT_CAUSE"
  | "INCIDENT_CRITICALITY"
  | "FILE"
  | "SUBSYSTEM"
  | "PREDICTION"
  | "RESOLUTION"
  | "KNOWLEDGE_GRAPH"
  | "ENGINEERING_ACTIVITY"
  | "EVIDENCE"
  | "AI_HANDOFF"
  | "UNKNOWN";

export interface CopilotFactItem {
  statement: string;
  provenance: ProvenanceType;
  category: string;
  source_reference?: string | null;
  confidence_rationale?: string | null;
}

export interface EntityReference {
  entity_id: string;
  entity_type:
    | "project"
    | "subsystem"
    | "file"
    | "incident"
    | "finding"
    | "prediction"
    | "resolution"
    | "session"
    | "health_dimension";
  label: string;
  subsystem?: string | null;
  url?: string | null;
  metadata: Record<string, unknown>;
}

export interface CopilotRecommendation {
  title: string;
  explanation: string;
  category: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  action_type:
    | "INVESTIGATE"
    | "KNOWLEDGE_GRAPH"
    | "REMEDIATE_SECURITY"
    | "REVIEW_HOTSPOT"
    | "PREVENT_REGRESSION"
    | "REVIEW_PRIORITY"
    | "MITIGATE_PREDICTION";
  target_entity?: string | null;
  deep_link_url?: string | null;
}

export interface CopilotEvidenceContext {
  project_id: string;
  project_display_name: string;
  query: string;
  detected_intent: CopilotIntent;
  target_entities: string[];
  answerable: boolean;
  answerability_reason: string;
  evidence_strength: "STRONG" | "MODERATE" | "LOW" | "INSUFFICIENT";
  observed_facts: CopilotFactItem[];
  inferred_facts: CopilotFactItem[];
  unknowns: CopilotFactItem[];
  relevant_files: string[];
  relevant_subsystems: string[];
  relevant_incidents: Record<string, unknown>[];
  relevant_findings: Record<string, unknown>[];
  relevant_predictions: Record<string, unknown>[];
  relevant_resolutions: Record<string, unknown>[];
  relevant_sessions: Record<string, unknown>[];
  evidence_references: string[];
  health_summary?: Record<string, unknown> | null;
  risk_summary?: Record<string, unknown> | null;
  graph_context?: Record<string, unknown> | null;
  generated_at: string;
}

export interface CopilotResponse {
  query: string;
  intent: CopilotIntent;
  answerable: boolean;
  answerability_reason: string;
  evidence_strength: "STRONG" | "MODERATE" | "LOW" | "INSUFFICIENT";
  summary: string;
  observed: CopilotFactItem[];
  inferred: CopilotFactItem[];
  unknown: CopilotFactItem[];
  recommendations: CopilotRecommendation[];
  evidence: Record<string, unknown>[];
  related_entities: EntityReference[];
  next_actions: { label: string; url: string }[];
  context_package?: CopilotEvidenceContext | null;
  generated_at: string;
}

export interface CopilotSuggestion {
  suggestion_id: string;
  category:
    | "HEALTH"
    | "SECURITY"
    | "INCIDENTS"
    | "SUBSYSTEMS"
    | "FILES"
    | "PREDICTIONS"
    | "KNOWLEDGE_GRAPH"
    | "GENERAL";
  question: string;
  intent?: CopilotIntent | null;
  rationale: string;
  badge?: string | null;
  priority_level: "HIGH" | "MEDIUM" | "LOW";
}
