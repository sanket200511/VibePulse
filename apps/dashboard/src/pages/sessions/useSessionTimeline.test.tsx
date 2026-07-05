import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useSessionTimeline } from "./useSessionTimeline";
import type { Timeline } from "./timeline-types";

function makeTimeline(overrides: Partial<Timeline> = {}): Timeline {
  return {
    session_id: "session-1",
    generated_at: "2026-07-04T00:00:00Z",
    entries: [],
    outcome: {
      duration_seconds: 0,
      event_count: 0,
      distinct_file_count: 0,
      primary_language: null,
      languages: {},
      largest_change: null,
      session_summary: null,
    },
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useSessionTimeline", () => {
  it("loads the timeline for the given session id", async () => {
    const timeline = makeTimeline({ session_id: "session-1" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toContain("/sessions/session-1/timeline");
        return { ok: true, status: 200, json: async () => timeline };
      }),
    );

    const { result } = renderHook(() => useSessionTimeline("session-1"), { wrapper });

    await waitFor(() => expect(result.current.timeline).toBeDefined());
    expect(result.current.timeline?.session_id).toBe("session-1");
    expect(result.current.isError).toBe(false);
  });

  it("surfaces an error state when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })),
    );

    const { result } = renderHook(() => useSessionTimeline("missing-session"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.timeline).toBeUndefined();
  });
});
