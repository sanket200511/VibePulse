/**
 * Wire shape for a Session Profile, matching
 * app.features.insights.schemas.SessionProfileRead / SessionInsightsRead on
 * the API exactly.
 */

export type InsightCategory =
  | "ACTIVITY"
  | "FILES"
  | "DIRECTORIES"
  | "LANGUAGES"
  | "DEVELOPMENT_PATTERNS"
  | "SESSION_STATISTICS"
  | "CONTEXT_SWITCHING"
  | "IDLE_BEHAVIOUR";

export interface DeveloperInsight {
  id: string;
  category: InsightCategory;
  generator_name: string;
  generator_version: number;
  headline: string;
  evidence: string | null;
  metrics: Record<string, unknown>;
}

export interface SessionProfile {
  session_id: string;
  generated_at: string;
  categories: Partial<Record<InsightCategory, DeveloperInsight[]>>;
}
