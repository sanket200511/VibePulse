/**
 * Wire-compatible event type enum.
 *
 * Values must match app.features.events.constants.EventType on the API
 * exactly — this is the contract between daemon and API.
 *
 * OBSERVATION_STARTED and OBSERVATION_STOPPED are boundary markers for
 * observation windows. They carry no file_path or file_name.
 */

export const EventType = {
  FILE_CREATED: "FILE_CREATED",
  FILE_MODIFIED: "FILE_MODIFIED",
  FILE_DELETED: "FILE_DELETED",
  OBSERVATION_STARTED: "OBSERVATION_STARTED",
  OBSERVATION_STOPPED: "OBSERVATION_STOPPED",
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

/** Event types that represent observation window boundaries. */
export const OBSERVATION_EVENT_TYPES = new Set<EventType>([
  EventType.OBSERVATION_STARTED,
  EventType.OBSERVATION_STOPPED,
]);

export const CURRENT_SCHEMA_VERSION = 1;

export interface DevelopmentEvent {
  schema_version: number;
  event_type: EventType;
  timestamp: string;
  session_id: string;
  project_root: string;
  /**
   * Null for observation boundary events (OBSERVATION_STARTED /
   * OBSERVATION_STOPPED), which are not tied to any specific file.
   */
  file_path: string | undefined;
  file_name: string | undefined;
  file_extension?: string | undefined;
  language?: string | undefined;
  git_branch?: string | undefined;
  metadata: Record<string, unknown>;
  /**
   * Monotonically increasing sequence number assigned by the normaliser,
   * scoped to the current daemon session_id. Starts at 0 on daemon startup.
   * Used as a secondary sort key for Replay when two events share the same
   * timestamp millisecond. Resets to 0 on daemon restart.
   */
  daemon_seq: number;
}
