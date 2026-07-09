import { describe, expect, it } from "vitest";
import { deriveSessionHeadline } from "./session-headline";
import type { Session } from "../sessions/types";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "session-1",
    project_root: "/repo",
    status: "ACTIVE",
    started_at: "2026-07-04T00:00:00Z",
    last_event_at: "2026-07-04T00:30:00Z",
    ended_at: null,
    git_branch: "main",
    event_count: 12,
    events_by_type: { FILE_MODIFIED: 12 },
    languages: { Python: 12 },
    duration_seconds: 1800,
    primary_language: "Python",
    distinct_file_count: 3,
    summary: null,
    ...overrides,
  };
}

describe("deriveSessionHeadline", () => {
  it("uses the generated summary headline when the session is completed", () => {
    const session = makeSession({
      status: "COMPLETED",
      summary: {
        headline: "12 events across 3 files mostly in Python over 30.0 min",
        duration_seconds: 1800,
        event_count: 12,
        primary_language: "Python",
        distinct_file_count: 3,
        dominant_event_type: "FILE_MODIFIED",
      },
    });

    expect(deriveSessionHeadline(session)).toBe(
      "12 events across 3 files mostly in Python over 30.0 min",
    );
  });

  it("composes a factual sentence from live counters when no summary exists yet", () => {
    const session = makeSession({ status: "ACTIVE", summary: null });

    expect(deriveSessionHeadline(session)).toBe("12 events across 3 files mostly in Python");
  });

  it("omits file and language phrases when there is no data for them yet", () => {
    const session = makeSession({
      summary: null,
      event_count: 1,
      distinct_file_count: 0,
      primary_language: null,
    });

    expect(deriveSessionHeadline(session)).toBe("1 event");
  });
});
