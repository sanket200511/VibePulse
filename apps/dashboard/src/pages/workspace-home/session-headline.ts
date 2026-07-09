/**
 * A one-line, factual description of a session — used wherever Workspace
 * Home needs a single sentence for a session (Continue Working's headline,
 * Recent Activity's summary). A COMPLETED session already has a generated
 * `summary.headline` (app.features.sessions.summary); for an ACTIVE or IDLE
 * session no summary exists yet, so this composes one from the same live
 * counters the API already exposes (event_count, distinct_file_count,
 * primary_language) rather than inventing one
 * (docs/design/UX_PRINCIPLES.md, "User Trust": never fabricate information).
 */

import type { Session } from "../sessions/types";

export function deriveSessionHeadline(session: Session): string {
  if (session.summary) return session.summary.headline;

  const parts = [`${session.event_count} event${session.event_count === 1 ? "" : "s"}`];
  if (session.distinct_file_count > 0) {
    parts.push(
      `across ${session.distinct_file_count} file${session.distinct_file_count === 1 ? "" : "s"}`,
    );
  }
  if (session.primary_language) {
    parts.push(`mostly in ${session.primary_language}`);
  }
  return parts.join(" ");
}
