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
    detection_type: string;
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

export interface ProjectContext {
  id: string;
  project_id: string;
  project_display_name: string;
  project_root_path: string;
  languages: Record<string, { count: number; percentage: number }>;
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
