import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { FakeWebSocket } from "../../test/fake-websocket";
import { useCurrentSession } from "./useCurrentSession";
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

function stubFetch(current: Session | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => current,
    })),
  );
}

beforeEach(() => {
  FakeWebSocket.reset();
  vi.stubGlobal("WebSocket", FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useCurrentSession", () => {
  it("loads the initial current session and opens a WebSocket subscription", async () => {
    stubFetch(makeSession("session-1"));
    const { result } = renderHook(() => useCurrentSession(), { wrapper });

    await waitFor(() => expect(result.current.session?.id).toBe("session-1"));
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("handles no current session on initial load", async () => {
    stubFetch(null);
    const { result } = renderHook(() => useCurrentSession(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session).toBeNull();
  });

  it("adopts a new session on session.started even while tracking none", async () => {
    stubFetch(null);
    const { result } = renderHook(() => useCurrentSession(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      FakeWebSocket.latest().emitMessage(
        JSON.stringify({ type: "session.started", session: makeSession("session-2") }),
      );
    });

    await waitFor(() => {
      expect(result.current.session?.id).toBe("session-2");
    });
  });

  it("applies session.updated broadcasts for the tracked session", async () => {
    stubFetch(makeSession("session-1"));
    const { result } = renderHook(() => useCurrentSession(), { wrapper });
    await waitFor(() => expect(result.current.session?.id).toBe("session-1"));

    act(() => {
      FakeWebSocket.latest().emitMessage(
        JSON.stringify({
          type: "session.updated",
          session: makeSession("session-1", { event_count: 5 }),
        }),
      );
    });

    await waitFor(() => {
      expect(result.current.session?.event_count).toBe(5);
    });
  });

  it("ignores broadcasts for sessions other than the one being tracked", async () => {
    stubFetch(makeSession("session-1"));
    const { result } = renderHook(() => useCurrentSession(), { wrapper });
    await waitFor(() => expect(result.current.session?.id).toBe("session-1"));

    act(() => {
      FakeWebSocket.latest().emitMessage(
        JSON.stringify({
          type: "session.updated",
          session: makeSession("session-999", { event_count: 42 }),
        }),
      );
    });

    await waitFor(() => {
      expect(result.current.session?.id).toBe("session-1");
      expect(result.current.session?.event_count).toBe(1);
    });
  });

  it("clears the tracked session on session.completed", async () => {
    stubFetch(makeSession("session-1"));
    const { result } = renderHook(() => useCurrentSession(), { wrapper });
    await waitFor(() => expect(result.current.session?.id).toBe("session-1"));

    act(() => {
      FakeWebSocket.latest().emitMessage(
        JSON.stringify({
          type: "session.completed",
          session: makeSession("session-1", { status: "COMPLETED" }),
        }),
      );
    });

    await waitFor(() => {
      expect(result.current.session).toBeNull();
    });
  });
});
