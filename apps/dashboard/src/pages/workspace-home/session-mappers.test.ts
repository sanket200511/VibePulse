import { describe, expect, it } from "vitest";
import {
  deriveReflectionObservation,
  toContinueWorkingSession,
  toRecentActivityItem,
} from "./session-mappers";
import type { Session } from "../sessions/types";
import type { SessionProfile } from "../sessions/insights-types";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "session-1",
    project_root: "/home/dev/code/vibepulse/apps/api",
    status: "IDLE",
    started_at: "2026-07-07T08:05:00Z",
    last_event_at: "2026-07-07T08:52:00Z",
    ended_at: null,
    git_branch: "main",
    event_count: 40,
    events_by_type: { FILE_MODIFIED: 40 },
    languages: { Python: 40 },
    duration_seconds: 2820,
    primary_language: "Python",
    distinct_file_count: 5,
    summary: null,
    ...overrides,
  };
}

describe("toContinueWorkingSession", () => {
  it("maps a Session onto the Continue Working shape", () => {
    const result = toContinueWorkingSession(makeSession());

    expect(result).toEqual({
      id: "session-1",
      projectName: "api",
      headline: "40 events across 5 files mostly in Python",
      primaryLanguage: "Python",
      durationMinutes: 47,
      lastActivityAt: "2026-07-07T08:52:00Z",
      status: "IDLE",
    });
  });

  it("falls back to 'Unknown' when no language has been observed yet", () => {
    const result = toContinueWorkingSession(makeSession({ primary_language: null, languages: {} }));
    expect(result.primaryLanguage).toBe("Unknown");
  });
});

describe("toRecentActivityItem", () => {
  it("maps a Session onto the Recent Activity shape", () => {
    const result = toRecentActivityItem(makeSession());

    expect(result).toEqual({
      id: "session-1",
      projectName: "api",
      occurredAt: "2026-07-07T08:52:00Z",
      summary: "40 events across 5 files mostly in Python",
      status: "IDLE",
    });
  });
});

describe("deriveReflectionObservation", () => {
  it("returns null when there is no profile yet", () => {
    expect(deriveReflectionObservation(undefined)).toBeNull();
  });

  it("returns null when the profile has no categories populated", () => {
    const profile: SessionProfile = {
      session_id: "session-1",
      generated_at: "2026-07-07T08:52:00Z",
      categories: {},
    };
    expect(deriveReflectionObservation(profile)).toBeNull();
  });

  it("returns the first insight's headline in fixed category order", () => {
    const profile: SessionProfile = {
      session_id: "session-1",
      generated_at: "2026-07-07T08:52:00Z",
      categories: {
        LANGUAGES: [
          {
            id: "insight-lang",
            category: "LANGUAGES",
            generator_name: "heuristic_v1",
            generator_version: 1,
            headline: "Should not win — ACTIVITY comes first",
            evidence: null,
            metrics: {},
          },
        ],
        ACTIVITY: [
          {
            id: "insight-activity",
            category: "ACTIVITY",
            generator_name: "heuristic_v1",
            generator_version: 1,
            headline: "Most of today's work stayed inside a single module.",
            evidence: null,
            metrics: {},
          },
        ],
      },
    };

    expect(deriveReflectionObservation(profile)).toBe(
      "Most of today's work stayed inside a single module.",
    );
  });
});
