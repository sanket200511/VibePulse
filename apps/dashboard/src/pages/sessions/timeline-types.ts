/**
 * Wire shape for a Session Timeline, matching
 * app.features.timeline.schemas.TimelineRead on the API exactly.
 */

export type TimelineEntryKind = "EVENT" | "GROUP" | "MARKER";

export type TimelineMarkerKind = "SESSION_START" | "SESSION_END" | "IDLE_GAP" | "LANGUAGE_SWITCH";

export interface TimelineEntryMetadata {
  timestamp: string;
  event_type: string | null;
  file_path: string | null;
  language: string | null;
  git_branch: string | null;
  group_size: number;
  group_span_seconds: number | null;
  member_event_ids: string[];
  marker_kind: TimelineMarkerKind | null;
  marker_detail: string | null;
}

export interface TimelineEntryInsights {
  analyzer_findings: Record<string, Record<string, unknown>>;
}

export interface TimelineEntry {
  id: string;
  entry_kind: TimelineEntryKind;
  metadata: TimelineEntryMetadata;
  insights: TimelineEntryInsights;
}

export interface TimelineLargestChange {
  file_path: string;
  event_count: number;
}

export interface SessionOutcome {
  duration_seconds: number;
  event_count: number;
  distinct_file_count: number;
  primary_language: string | null;
  languages: Record<string, number>;
  largest_change: TimelineLargestChange | null;
  session_summary: Record<string, unknown> | null;
}

export interface Timeline {
  session_id: string;
  generated_at: string;
  entries: TimelineEntry[];
  outcome: SessionOutcome;
}
