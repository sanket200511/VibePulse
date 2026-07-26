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
