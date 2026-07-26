/**
 * Wire shape for a Session, matching
 * app.features.sessions.schemas.SessionRead on the API exactly.
 */

export type SessionStatus = "ACTIVE" | "IDLE" | "COMPLETED";

export interface SessionSummary {
  headline: string;
  duration_seconds: number;
  event_count: number;
  primary_language: string | null;
  distinct_file_count: number;
  dominant_event_type: string | null;
}

export interface Session {
  id: string;
  project_id: string | null;
  project_root: string;
  status: SessionStatus;
  started_at: string;
  last_event_at: string;
  ended_at: string | null;
  git_branch: string | null;
  event_count: number;
  events_by_type: Record<string, number>;
  languages: Record<string, number>;
  duration_seconds: number;
  primary_language: string | null;
  distinct_file_count: number;
  summary: SessionSummary | null;
}
