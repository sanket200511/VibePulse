/**
 * Wire shape for GET /sessions/{id}/replay, matching
 * app.features.replay.schemas.ReplayRead on the API exactly.
 */

import type {
  TimelineEntryInsights,
  TimelineEntryKind,
  TimelineEntryMetadata,
} from "./timeline-types";

export type ChapterKind = "SESSION_STARTED" | "WORK" | "IDLE" | "RESUMED" | "SESSION_COMPLETED";

export interface ReplayFrame {
  id: string;
  index: number;
  timestamp: string;
  kind: TimelineEntryKind;
  metadata: TimelineEntryMetadata;
  insights: TimelineEntryInsights;
  chapter_id: number;
  is_chapter_start: boolean;
}

export interface ReplayChapter {
  id: number;
  label: string;
  kind: ChapterKind;
  start_frame_index: number;
  end_frame_index: number;
  start_timestamp: string;
  end_timestamp: string;
  duration_seconds: number;
  summary_metrics: Record<string, unknown>;
}

export interface Replay {
  session_id: string;
  generated_at: string;
  frames: ReplayFrame[];
  chapters: ReplayChapter[];
}
