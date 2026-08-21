export type ProvenanceType = "OBSERVED" | "INFERRED" | "UNKNOWN";
export type EntityType = "health" | "security" | "incident" | "prediction" | "priority";

export interface EvidenceItem {
  evidence_id: string;
  project_id: string;
  timestamp: string;
  source_type: string;
  source_id?: string | null;
  event_id?: string | null;
  session_id?: string | null;
  file_path?: string | null;
  subsystem?: string | null;
  rule_id?: string | null;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" | null;
  title: string;
  observed_value?: string | null;
  derived_value?: string | null;
  provenance: ProvenanceType;
  explanation: string;
  redacted_evidence?: string | null;
  related_entities: Array<{ type: string; id?: string; path?: string }>;
}

export interface EvidenceChainStep {
  step_number: number;
  stage:
    | "OBSERVE"
    | "DETECT"
    | "INVESTIGATE"
    | "RESOLVE"
    | "LEARN"
    | "ANTICIPATE"
    | "HEALTH"
    | "PRIORITY";
  title: string;
  description: string;
  provenance: ProvenanceType;
  evidence_item?: EvidenceItem | null;
  entity_link?: string | null;
}

export interface ScoreDecompositionItem {
  dimension_name: string;
  dimension_key: string;
  raw_score: number;
  weight: number;
  weighted_contribution: number;
  explanation: string;
  contributing_signals: string[];
  provenance: ProvenanceType;
}

export interface EntityExplainabilityResponse {
  entity_type: EntityType;
  entity_id: string;
  project_id: string;
  title: string;
  summary: string;
  why_explanation: string;
  score?: number | null;
  score_decomposition: ScoreDecompositionItem[];
  evidence_chain: EvidenceChainStep[];
  evidence_items: EvidenceItem[];
  contributing_signals: string[];
  provenance: ProvenanceType;
  remediation?: string | null;
  redaction_verified: boolean;
  generated_at: string;
}
