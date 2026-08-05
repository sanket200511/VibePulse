export interface Project {
  id: string;
  display_name: string;
  root_path: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectIntelligence {
  project_id: string;
  observation_window: {
    first_observed_at: string | null;
    latest_observed_at: string | null;
  };
  metrics: {
    total_sessions: number;
    total_events: number;
  };
  activity_series: Array<{
    session_id: string;
    started_at: string;
    event_count: number;
    status: string;
  }>;
  event_composition: Record<string, number>;
  language_activity: Record<string, number>;
  frequently_observed_files: Array<{
    path: string;
    event_count: number;
  }>;
}

export interface BiographyEntry {
  timestamp: string;
  event_id: string;
  session_id: string;
  finding: string;
}

export interface EngineeringDNARead {
  identity: string;
  path: string;
  created_at: string | null;
  last_seen: string | null;
  observed_sessions: number;
  observed_events: number;
  functions_created: number;
  functions_removed: number;
  classes_created: number;
  classes_removed: number;
  imports_added: number;
  imports_removed: number;
  security_findings: number;
  todos_created: number;
  todos_resolved: number;
  major_refactors: number;
  rename_events: number;
  largest_session: string | null;
  first_authoring_session: string | null;
  latest_authoring_session: string | null;
  age: string;
  biography: BiographyEntry[];
}
