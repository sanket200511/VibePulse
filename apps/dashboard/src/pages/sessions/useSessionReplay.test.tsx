import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useSessionReplay } from "./useSessionReplay";
import type { Replay } from "./replay-types";

function makeReplay(overrides: Partial<Replay> = {}): Replay {
  return {
    session_id: "session-1",
    generated_at: "2026-07-04T00:00:00Z",
    frames: [],
    chapters: [],
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

describe("useSessionReplay", () => {
  it("does not fetch when enabled is false", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSessionReplay("session-1", false), { wrapper });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.replay).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("loads the replay for the given session id once enabled", async () => {
    const replay = makeReplay({ session_id: "session-1" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toContain("/sessions/session-1/replay");
        return { ok: true, status: 200, json: async () => replay };
      }),
    );

    const { result } = renderHook(() => useSessionReplay("session-1", true), { wrapper });

    await waitFor(() => expect(result.current.replay).toBeDefined());
    expect(result.current.replay?.session_id).toBe("session-1");
    expect(result.current.isError).toBe(false);
  });

  it("surfaces an error state when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 409, json: async () => ({}) })),
    );

    const { result } = renderHook(() => useSessionReplay("session-1", true), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.replay).toBeUndefined();
  });
});
