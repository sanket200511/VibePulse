import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeWebSocket } from "../../test/fake-websocket";
import { WorkspaceHomePage } from "./WorkspaceHomePage";
import type { Session } from "../sessions/types";
import type { SessionProfile } from "../sessions/insights-types";
import type { HealthReport } from "../sessions/health-types";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "session-1",
    project_root: "/home/dev/code/vibepulse/apps/api",
    status: "COMPLETED",
    started_at: "2026-07-07T08:05:00Z",
    last_event_at: "2026-07-07T08:52:00Z",
    ended_at: "2026-07-07T08:52:00Z",
    git_branch: "main",
    event_count: 40,
    events_by_type: { FILE_MODIFIED: 40 },
    languages: { Python: 40 },
    duration_seconds: 2820,
    primary_language: "Python",
    distinct_file_count: 5,
    summary: {
      headline: "40 events across 5 files mostly in Python over 47.0 min",
      duration_seconds: 2820,
      event_count: 40,
      primary_language: "Python",
      distinct_file_count: 5,
      dominant_event_type: "FILE_MODIFIED",
    },
    ...overrides,
  };
}

const profile: SessionProfile = {
  session_id: "session-1",
  generated_at: "2026-07-07T08:52:00Z",
  categories: {
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

const health: HealthReport = {
  session_id: "session-1",
  generated_at: "2026-07-07T08:52:00Z",
  metrics: {},
  summary: {
    narrative: "A steady, focused session with no unusual context switching.",
    guidance: [],
  },
};

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <WorkspaceHomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  FakeWebSocket.reset();
  vi.stubGlobal("WebSocket", FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WorkspaceHomePage", () => {
  it("shows a loading state before the sessions request resolves", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );

    renderPage();

    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
  });

  it("renders all sections with real session, reflection, and health data once loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const url = String(input);
        if (url.includes("/profile")) return jsonResponse(profile);
        if (url.includes("/health")) return jsonResponse(health);
        return jsonResponse({ sessions: [makeSession()] });
      }),
    );

    renderPage();

    await waitFor(() => expect(screen.getByRole("link", { name: "Resume" })).toBeInTheDocument());

    expect(
      screen.getAllByText("40 events across 5 files mostly in Python over 47.0 min").length,
    ).toBeGreaterThan(0);
    await waitFor(() =>
      expect(
        screen.getByText("Most of today's work stayed inside a single module."),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByText("A steady, focused session with no unusual context switching."),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("No projects connected yet")).toBeInTheDocument();
  });

  it("renders empty states when there are no sessions yet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ sessions: [] })),
    );

    renderPage();

    await waitFor(() => expect(screen.getByText("No sessions yet")).toBeInTheDocument());
    expect(screen.getByText("No recent activity yet")).toBeInTheDocument();
    expect(screen.getByText("No reflection yet")).toBeInTheDocument();
    expect(screen.getByText("No health report yet")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Resume" })).not.toBeInTheDocument();
  });

  it("renders an error state when the sessions request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })),
    );

    renderPage();

    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
  });
});
