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

export interface TechnologyDetail {
  name: string;
  category: string;
  provenance?: {
    source: string;
    evidence: string;
    classification?: "OBSERVED" | "INFERRED" | "UNKNOWN";
    confidence_reason?: string;
    detection_type?: string;
  };
}

export interface ImportantFileDetail {
  path: string;
  reason: string;
  activity_count: number;
  last_modified: string | null;
}

export interface ConfigurationFileDetail {
  path: string;
  kind: string;
}

export interface DevelopmentPatternDetail {
  name: string;
  description: string;
  evidence_count: number;
  sample_files: string[];
}

export interface SecuritySummaryDetail {
  total_findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  top_rules: string[];
}

export interface ActivitySummaryDetail {
  total_sessions: number;
  total_events: number;
  first_observed_at: string | null;
  latest_observed_at: string | null;
  frequently_observed_files: Array<{
    path: string;
    event_count: number;
  }>;
}

export interface ArchitectureSummaryDetail {
  project_type: string;
  source_roots: string[];
  test_roots: string[];
  modules: string[];
}

export interface ActivityHeatmapCell {
  day_of_week: number; // 0=Mon..6=Sun
  hour_of_day: number; // 0..23
  event_count: number;
}

export interface FileActivityRanking {
  file_path: string;
  event_count: number;
  event_types_breakdown: Record<string, number>;
  last_observed_at: string | null;
}

export interface DevelopmentFocusDetail {
  focus: string;
  classification: string;
  confidence_reason: string;
  evidence_summary: string[];
  active_window: string;
}

export interface ArchitectureSignalDetail {
  signal: string;
  classification: string;
  evidence_files: string[];
  description: string;
}

export interface GitIntelligenceDetail {
  is_git_repository: boolean;
  branch: string | null;
  latest_commit_hash: string | null;
  latest_commit_timestamp: string | null;
  uncommitted_changes_count: number;
  provenance: string;
}

export interface ProjectContext {
  id: string;
  project_id: string;
  project_display_name: string;
  project_root_path: string;
  languages: Record<string, { count: number; percentage: number; recent_activity_count?: number }>;
  frameworks: TechnologyDetail[];
  technologies: TechnologyDetail[];
  package_managers: TechnologyDetail[];
  important_files: ImportantFileDetail[];
  configuration_files: ConfigurationFileDetail[];
  test_directories: string[];
  source_directories: string[];
  git_context: {
    branch: string | null;
    tracked_branches: string[];
  };
  development_patterns: DevelopmentPatternDetail[];
  security_summary: SecuritySummaryDetail;
  activity_summary: ActivitySummaryDetail;
  architecture_summary: ArchitectureSummaryDetail;

  development_focus?: DevelopmentFocusDetail;
  activity_heatmap?: ActivityHeatmapCell[];
  file_rankings?: FileActivityRanking[];
  architecture_signals?: ArchitectureSignalDetail[];
  git_intelligence?: GitIntelligenceDetail;

  context_version: number;
  first_observed_at: string | null;
  last_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
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
