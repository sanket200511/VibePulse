/**
 * Wire-compatible event type enum.
 *
 * Values must match app.features.events.constants.EventType on the API
 * exactly — this is the contract between daemon and API.
 */

export const EventType = {
  FILE_CREATED: "FILE_CREATED",
  FILE_MODIFIED: "FILE_MODIFIED",
  FILE_DELETED: "FILE_DELETED",
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

export const CURRENT_SCHEMA_VERSION = 1;

export interface DevelopmentEvent {
  schema_version: number;
  event_type: EventType;
  timestamp: string;
  session_id: string;
  project_root: string;
  file_path: string;
  file_name: string;
  file_extension?: string | undefined;
  language?: string | undefined;
  git_branch?: string | undefined;
  metadata: Record<string, unknown>;
}
