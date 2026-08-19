/**
 * Normaliser.
 *
 * Owns event classification, metadata extraction, path validation, and
 * daemon_seq assignment. Every raw filesystem event passes through here
 * before reaching the observation gate.
 *
 * Responsibilities:
 *   - Classify Chokidar raw event → EventType
 *   - Extract file_name, file_extension, language, git_branch
 *   - Validate path: length ≤ 2048, must be a descendant of project_root
 *   - Assign daemon_seq (monotonically increasing, scoped to this instance)
 *
 * Explicitly NOT responsible for:
 *   - Publishing events
 *   - Debouncing
 *   - Reading configuration
 *   - Retry logic
 *   - Any I/O beyond git_branch detection
 */

import { extname, basename, normalize, sep } from "path";
import { CURRENT_SCHEMA_VERSION, type DevelopmentEvent, type EventType } from "./event-types";
import { detectLanguage } from "./language-detector";
import { getGitBranch } from "./git-branch";

const MAX_FILE_PATH_LENGTH = 2048;

export interface NormaliserOptions {
  projectRoot: string;
  sessionId: string;
}

export interface Normaliser {
  /**
   * Builds a DevelopmentEvent from a raw filesystem path and event type.
   *
   * Returns null when the path is invalid (too long, or outside project_root).
   * The caller is responsible for discarding null results.
   */
  normalise(eventType: EventType, filePath: string): DevelopmentEvent | null;
}

/**
 * Creates a Normaliser bound to a specific project root and session.
 *
 * The returned normaliser maintains its own monotonic daemon_seq counter
 * that starts at 0 and increments by 1 on every successful normalisation.
 */
export function createNormaliser({ projectRoot, sessionId }: NormaliserOptions): Normaliser {
  let seq = 0;

  // Normalise the project root so path containment checks are reliable
  // across platforms (e.g. trailing separators, mixed slashes on Windows).
  const normalisedRoot = normalize(projectRoot);

  return {
    normalise(eventType: EventType, filePath: string): DevelopmentEvent | null {
      if (filePath.length > MAX_FILE_PATH_LENGTH) {
        return null;
      }

      // Ensure the file is a strict descendant of the project root.
      // Append sep so that a root of /proj does not match /project-other.
      const normalisedPath = normalize(filePath);
      const isDescendant =
        process.platform === "win32"
          ? normalisedPath.toLowerCase().startsWith((normalisedRoot + sep).toLowerCase())
          : normalisedPath.startsWith(normalisedRoot + sep);
      if (!isDescendant) {
        return null;
      }

      const fileExtension = extname(filePath) || undefined;

      const event: DevelopmentEvent = {
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
        daemon_seq: seq++,
      };

      return event;
    },
  };
}
