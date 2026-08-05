import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { TimeMachineProvider, useTimeMachine } from "./TimeMachineContext";
import type { Session } from "../sessions/types";
import type { ArchitectureTimelineEntry } from "../sessions/useSessionArchitectureTimeline";
import type { ProjectIntelligence } from "./types";
import React from "react";

const mockSessions: Session[] = [
  {
    id: "session-1",
    status: "COMPLETED",
    started_at: "2024-01-01T10:00:00Z",
    last_event_at: "2024-01-01T10:30:00Z",
    project_id: "project-1",
    project_root: "/",
    ended_at: "2024-01-01T10:30:00Z",
    git_branch: "main",
    event_count: 5,
    events_by_type: {},
    languages: {},
    duration_seconds: 1800,
    primary_language: "TypeScript",
    distinct_file_count: 2,
    summary: null,
  },
  {
    id: "session-2",
    status: "ACTIVE",
    started_at: "2024-01-02T10:00:00Z",
    last_event_at: "2024-01-02T11:00:00Z",
    project_id: "project-1",
    project_root: "/",
    ended_at: null,
    git_branch: "main",
    event_count: 10,
    events_by_type: {},
    languages: {},
    duration_seconds: 3600,
    primary_language: "TypeScript",
    distinct_file_count: 5,
    summary: null,
  },
];

const mockEntries: ArchitectureTimelineEntry[] = [
  {
    id: "entry-1",
    timestamp: "2024-01-01T10:15:00Z",
    kind: "CODE_EVOLUTION",
    title: "Function Added",
    description: "Added helper",
    related_file: null,
    related_event_id: null,
    analysis_reference: null,
    severity: null,
  },
  {
    id: "entry-2",
    timestamp: "2024-01-02T10:30:00Z",
    kind: "SECURITY_FINDING",
    title: "API Key Exposed",
    description: "Found secret",
    related_file: null,
    related_event_id: null,
    analysis_reference: null,
    severity: "HIGH",
  },
];

const mockIntelligence: ProjectIntelligence = {
  project_id: "project-1",
  frequently_observed_files: [],
  language_activity: {},
  event_composition: {},
  activity_series: [
    {
      session_id: "session-1",
      started_at: "2024-01-01T10:00:00Z",
      event_count: 5,
      status: "COMPLETED",
    },
    {
      session_id: "session-2",
      started_at: "2024-01-02T10:00:00Z",
      event_count: 10,
      status: "ACTIVE",
    },
  ],
  observation_window: {
    first_observed_at: "2024-01-01T10:00:00Z",
    latest_observed_at: "2024-01-02T11:00:00Z",
  },
  metrics: { total_sessions: 2, total_events: 15 },
};

describe("TimeMachineContext Engine", () => {
  it("defaults to LIVE mode and returns all data", () => {
    const { result } = renderHook(() => useTimeMachine(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <TimeMachineProvider
          rawSessions={mockSessions}
          rawEntries={mockEntries}
          rawIntelligence={mockIntelligence}
        >
          {children}
        </TimeMachineProvider>
      ),
    });

    expect(result.current.mode).toBe("LIVE");
    expect(result.current.visibleSessions).toHaveLength(2);
    expect(result.current.visibleEntries).toHaveLength(2);
    expect(result.current.visibleIntelligence?.metrics.total_sessions).toBe(2);
    expect(result.current.evolutionDiff).toBeNull();
  });

  it("filters correctly in TIME_TRAVEL mode when selectedTime is updated", () => {
    const { result } = renderHook(() => useTimeMachine(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <TimeMachineProvider
          rawSessions={mockSessions}
          rawEntries={mockEntries}
          rawIntelligence={mockIntelligence}
        >
          {children}
        </TimeMachineProvider>
      ),
    });

    act(() => {
      result.current.setMode("TIME_TRAVEL");
    });

    // Default time is maxTime (2024-01-02T11:00:00Z)
    expect(result.current.visibleSessions).toHaveLength(2);

    // Move time back to just after session 1
    act(() => {
      result.current.setSelectedTime(new Date("2024-01-01T10:45:00Z").getTime());
    });

    expect(result.current.visibleSessions).toHaveLength(1);
    expect(result.current.visibleSessions[0]?.id).toBe("session-1");
    expect(result.current.visibleEntries).toHaveLength(1);
    expect(result.current.visibleEntries[0]?.id).toBe("entry-1");
    expect(result.current.visibleIntelligence?.metrics.total_sessions).toBe(1);

    // Evolution diff should contain entry-2
    expect(result.current.evolutionDiff).not.toBeNull();
    expect(result.current.evolutionDiff?.securityFindings).toBe(1);
    expect(result.current.evolutionDiff?.addedFunctions).toBe(0);
  });
});
