import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { FakeWebSocket } from "../../test/fake-websocket";
import { useSessionsData } from "./useSessionsData";
import type { Session } from "./types";

function makeSession(id: string, overrides: Partial<Session> = {}): Session {
  return {
    id,
    project_id: "test_project_id",
    project_root: "/repo",
    status: "ACTIVE",
    started_at: "2026-07-04T00:00:00Z",
    last_event_at: "2026-07-04T00:00:00Z",
    ended_at: null,
    git_branch: "main",
    event_count: 1,
    events_by_type: { FILE_MODIFIED: 1 },
    languages: { typescript: 1 },
    duration_seconds: 0,
    primary_language: "typescript",
    distinct_file_count: 1,
    summary: null,
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  FakeWebSocket.reset();
  vi.stubGlobal("WebSocket", FakeWebSocket);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ sessions: [makeSession("session-1")] }),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useSessionsData", () => {
  it("loads the initial sessions and opens a WebSocket subscription", async () => {
    const { result } = renderHook(() => useSessionsData(), { wrapper });

    await waitFor(() => expect(result.current.sessions).toHaveLength(1));
    expect(result.current.sessions[0]?.id).toBe("session-1");
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("upserts a session already in the list rather than duplicating it", async () => {
    const { result } = renderHook(() => useSessionsData(), { wrapper });
    await waitFor(() => expect(result.current.sessions).toHaveLength(1));

    act(() => {
      FakeWebSocket.latest().emitMessage(
        JSON.stringify({
          type: "session.updated",
          session: makeSession("session-1", { event_count: 9 }),
        }),
      );
    });

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0]?.event_count).toBe(9);
    });
  });

  it("adds a new session from a broadcast and sorts by last_event_at", async () => {
    const { result } = renderHook(() => useSessionsData(), { wrapper });
    await waitFor(() => expect(result.current.sessions).toHaveLength(1));

    act(() => {
      FakeWebSocket.latest().emitMessage(
        JSON.stringify({
          type: "session.started",
          session: makeSession("session-2", { last_event_at: "2026-07-04T01:00:00Z" }),
        }),
      );
    });

    await waitFor(() => {
      expect(result.current.sessions.map((session) => session.id)).toEqual([
        "session-2",
        "session-1",
      ]);
    });
  });

  it("ignores malformed WebSocket payloads without crashing or changing the list", async () => {
    const { result } = renderHook(() => useSessionsData(), { wrapper });
    await waitFor(() => expect(result.current.sessions).toHaveLength(1));

    act(() => {
      FakeWebSocket.latest().emitMessage("not valid json{{{");
    });

    expect(result.current.sessions).toHaveLength(1);
  });

  it("tracks connection status and closes the socket on unmount", async () => {
    const { result, unmount } = renderHook(() => useSessionsData(), { wrapper });
    await waitFor(() => expect(result.current.sessions).toHaveLength(1));

    expect(result.current.connectionStatus).toBe("connecting");

    act(() => {
      FakeWebSocket.latest().emitOpen();
    });
    expect(result.current.connectionStatus).toBe("open");

    unmount();
    expect(FakeWebSocket.latest().closed).toBe(true);
  });
});
