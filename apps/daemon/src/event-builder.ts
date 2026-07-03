/**
 * Builds a wire-shape DevelopmentEvent from a raw file system change.
 */

import { extname, basename } from "path";
import { type DevelopmentEvent, type EventType, CURRENT_SCHEMA_VERSION } from "./event-types";
import { detectLanguage } from "./language-detector";
import { getGitBranch } from "./git-branch";

export interface BuildEventInput {
  eventType: EventType;
  filePath: string;
  projectRoot: string;
  sessionId: string;
}

export function buildEvent({
  eventType,
  filePath,
  projectRoot,
  sessionId,
}: BuildEventInput): DevelopmentEvent {
  const fileExtension = extname(filePath) || undefined;

  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    event_type: eventType,
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    project_root: projectRoot,
    file_path: filePath,
    file_name: basename(filePath),
    file_extension: fileExtension,
    language: detectLanguage(fileExtension),
    git_branch: getGitBranch(projectRoot),
    metadata: {},
  };
}
