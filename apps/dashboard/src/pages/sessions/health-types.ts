/**
 * Wire shape for GET /sessions/{id}/health, matching
 * app.features.session_health.schemas.HealthReportRead on the API exactly.
 */

export type HealthCategory = "FOCUS" | "MOMENTUM" | "FLOW" | "STABILITY" | "COMPLETION";

export interface HealthMetric {
  id: string;
  category: HealthCategory;
  generator_name: string;
  generator_version: number;
  label: string;
  headline: string;
  evidence: string | null;
  metrics: Record<string, unknown>;
}

export interface HealthSummary {
  narrative: string;
  guidance: string[];
}

export interface HealthReport {
  session_id: string;
  generated_at: string;
  metrics: Partial<Record<HealthCategory, HealthMetric>>;
  summary: HealthSummary;
}
