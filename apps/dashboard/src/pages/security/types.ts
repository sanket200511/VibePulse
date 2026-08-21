export interface SecurityPosture {
  critical: number;
  high: number;
  medium: number;
  low: number;
  sensitive_files_count: number;
  security_events_count: number;
  open_findings_count: number;
}

export interface SecurityFinding {
  finding_id: string;
  rule_id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  project_id?: string | null;
  file_path: string;
  line_number?: number | null;
  evidence: string;
  redacted_evidence: string;
  detected_at: string;
  status: "OPEN" | "RESOLVED" | "MUTED";
  provenance: "OBSERVED" | "INFERRED" | "UNKNOWN";
  what?: string | null;
  why?: string | null;
  where?: string | null;
  remediation: string;
  risk_contribution: number;
}

export interface SensitiveFileDetail {
  file_path: string;
  role: string;
  activity_count: number;
  last_modified?: string | null;
  findings_count: number;
  findings: string[];
}

export interface AuthenticationSignalDetail {
  signal_name: string;
  classification: "OBSERVED" | "INFERRED" | "UNKNOWN";
  evidence: string;
  evidence_files: string[];
  confidence_reason: string;
}

export interface ConfigurationRiskDetail {
  title: string;
  file_path: string;
  evidence: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  classification: "OBSERVED" | "INFERRED" | "UNKNOWN";
  remediation: string;
}

export interface DependencyInventory {
  direct_count: number;
  dev_count: number;
  total_count: number;
  manifest_files: string[];
  vulnerability_intelligence_status: string;
}

export interface SecurityActivitySummary {
  credential_exposure_count: number;
  auth_changes_count: number;
  config_changes_count: number;
  analyzer_alerts_count: number;
  window_days: number;
}

export interface SecurityTrendPoint {
  date_label: string;
  event_count: number;
  finding_count: number;
}

export interface CorrelatedSecurityIncident {
  incident_id: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  risk_score: number;
  session_id?: string | null;
  affected_files: string[];
  event_count: number;
  first_event_at: string;
  latest_event_at: string;
  contributing_findings: SecurityFinding[];
  evidence_summary: string[];
}

export interface RiskScoreBreakdownItem {
  factor: string;
  points: number;
  category: string;
}

export interface RiskScoreExplanation {
  total_score: number;
  risk_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  breakdown: RiskScoreBreakdownItem[];
}

export interface SecurityIntelligence {
  project_id: string;
  project_display_name: string;
  project_root_path: string;
  security_posture: SecurityPosture;
  security_findings: SecurityFinding[];
  sensitive_files: SensitiveFileDetail[];
  authentication_signals: AuthenticationSignalDetail[];
  configuration_risks: ConfigurationRiskDetail[];
  dependency_inventory: DependencyInventory;
  security_activity: SecurityActivitySummary;
  security_trend: SecurityTrendPoint[];
  correlated_incidents: CorrelatedSecurityIncident[];
  risk_explanation: RiskScoreExplanation;
  analysis_version: number;
  last_analyzed_at: string;
  metadata?: Record<string, unknown>;
}
