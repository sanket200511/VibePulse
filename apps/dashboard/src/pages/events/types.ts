/**
 * Wire shape for a development event, matching
 * app.features.events.schemas.DevelopmentEventRead on the API exactly.
 */

export type EventType = "FILE_CREATED" | "FILE_MODIFIED" | "FILE_DELETED";

export interface DevelopmentEvent {
  id: string;
  schema_version: number;
  event_type: EventType;
  timestamp: string;
  session_id: string;
  project_root: string;
  file_path: string;
  file_name: string;
  file_extension: string | null;
  language: string | null;
  git_branch: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
