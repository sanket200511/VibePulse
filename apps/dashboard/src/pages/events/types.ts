/**
 * Wire shape for a development event, matching
 * app.features.events.schemas.DevelopmentEventRead on the API exactly.
 */

export type EventType =
  | "FILE_CREATED"
  | "FILE_MODIFIED"
  | "FILE_DELETED"
  | "OBSERVATION_STARTED"
  | "OBSERVATION_STOPPED"
  | "AI_REQUEST_STARTED"
  | "AI_RESPONSE_RECEIVED"
  | "AI_TOOL_EXECUTED"
  | "AI_COMPLETION_ACCEPTED";

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
