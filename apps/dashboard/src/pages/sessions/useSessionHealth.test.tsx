import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useSessionHealth } from "./useSessionHealth";
import type { HealthReport } from "./health-types";

function makeHealthReport(overrides: Partial<HealthReport> = {}): HealthReport {
  return {
    session_id: "session-1",
    generated_at: "2026-07-04T00:00:00Z",
    metrics: {},
    summary: { narrative: "", guidance: [] },
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

describe("useSessionHealth", () => {
  it("does not fetch when enabled is false", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSessionHealth("session-1", false), { wrapper });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.health).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("loads the health report for the given session id once enabled", async () => {
    const health = makeHealthReport({ session_id: "session-1" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toContain("/sessions/session-1/health");
        return { ok: true, status: 200, json: async () => health };
      }),
    );

    const { result } = renderHook(() => useSessionHealth("session-1", true), { wrapper });

    await waitFor(() => expect(result.current.health).toBeDefined());
    expect(result.current.health?.session_id).toBe("session-1");
    expect(result.current.isError).toBe(false);
  });

  it("surfaces an error state when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 409, json: async () => ({}) })),
    );

    const { result } = renderHook(() => useSessionHealth("session-1", true), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.health).toBeUndefined();
  });
});
