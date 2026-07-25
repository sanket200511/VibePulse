import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionDetailsPage } from "./SessionDetailsPage";
import { ReplayPage } from "./ReplayPage";
import { SessionsPage } from "./SessionsPage";
import { TimelineEntryRow } from "./TimelineEntryRow";
import { vi, describe, it, expect } from "vitest";
import type { TimelineEntry } from "./timeline-types";

// Mock the demo config so it always runs in Demo Mode for these tests
vi.mock("../../demo/config", () => ({
  useDemoMode: () => ({ isDemo: true, setDemoMode: vi.fn() }),
}));

// Mock the ReplayView to avoid testing canvas/complex internal rendering here
vi.mock("./ReplayView", () => ({
  ReplayView: () => <div data-testid="mock-replay-view">Replay Player</div>,
}));

function renderWithProviders(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/history" element={<SessionsPage />} />
          <Route path="/sessions/:sessionId" element={<SessionDetailsPage />} />
          <Route path="/sessions/:sessionId/replay" element={<ReplayPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Session Integration", () => {
  it("1. session_vibesync_002 resolves as the ACTIVE Demo session", () => {
    renderWithProviders("/sessions/session_vibesync_002");
    // ACTIVE demo session does NOT have a timeline yet, so it renders EmptyState timeline
    expect(screen.getByText("No timeline for this session")).toBeInTheDocument();
  });

  it("2. session_vibesync_001 resolves as the COMPLETED Demo session", () => {
    renderWithProviders("/sessions/session_vibesync_001");
    // Completed session has timeline, insights, etc.
    expect(screen.getByText("Observed Patterns")).toBeInTheDocument();
    expect(screen.getByText("Session Signals")).toBeInTheDocument();
  });

  it("3. An unknown Demo session ID renders the Session Not Found state", () => {
    renderWithProviders("/sessions/session_unknown_999");
    expect(screen.getByText("Session not found")).toBeInTheDocument();
  });

  it("4. Rendering the completed Demo session timeline does not throw", () => {
    expect(() => renderWithProviders("/sessions/session_vibesync_001")).not.toThrow();
  });

  it("5. History -> completed session uses the correct canonical session ID", () => {
    renderWithProviders("/history");
    const link = screen.getByText(/Initial observation client structure/i).closest("a");
    expect(link).toHaveAttribute("href", "/sessions/session_vibesync_001");
  });

  it("6. Completed Session Details exposes 'Replay Session'", () => {
    renderWithProviders("/sessions/session_vibesync_001");
    const link = screen.getByRole("link", { name: /Replay Session/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/sessions/session_vibesync_001/replay");
  });

  it("7. Active Session Details does NOT expose Replay Session", () => {
    renderWithProviders("/sessions/session_vibesync_002");
    expect(screen.queryByRole("link", { name: /Replay Session/i })).not.toBeInTheDocument();
  });

  it("8. Clicking Replay Session navigates to Replay route", async () => {
    renderWithProviders("/sessions/session_vibesync_001");
    const link = screen.getByRole("link", { name: /Replay Session/i });

    act(() => {
      fireEvent.click(link);
    });

    expect(await screen.findByTestId("mock-replay-view")).toBeInTheDocument();
  });

  it("9. Replay route renders using session_vibesync_001 Replay data", () => {
    renderWithProviders("/sessions/session_vibesync_001/replay");
    expect(screen.getByTestId("mock-replay-view")).toBeInTheDocument();
  });

  it("10. An unknown/unsupported event type cannot crash TimelineEntryRow if such values are legitimately possible at runtime", () => {
    const unknownEntry: TimelineEntry = {
      id: "unknown_1",
      entry_kind: "EVENT",
      metadata: {
        timestamp: "2026-07-15T10:00:00Z",
        event_type: "UNSUPPORTED_RANDOM_EVENT_TYPE",
        file_path: "foo.ts",
        language: "TypeScript",
        git_branch: "main",
        group_size: 1,
        group_span_seconds: null,
        member_event_ids: [],
        marker_kind: null,
        marker_detail: null,
      },
      insights: { analyzer_findings: {} },
    };

    expect(() => render(<TimelineEntryRow entry={unknownEntry} />)).not.toThrow();
  });
});
