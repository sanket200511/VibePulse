import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useSessionInsights } from "./useSessionInsights";
import type { SessionProfile } from "./insights-types";

function makeProfile(overrides: Partial<SessionProfile> = {}): SessionProfile {
  return {
    session_id: "session-1",
    generated_at: "2026-07-04T00:00:00Z",
    categories: {},
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

describe("useSessionInsights", () => {
  it("loads the profile for the given session id", async () => {
    const profile = makeProfile({ session_id: "session-1" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toContain("/sessions/session-1/profile");
        return { ok: true, status: 200, json: async () => profile };
      }),
    );

    const { result } = renderHook(() => useSessionInsights("session-1"), { wrapper });

    await waitFor(() => expect(result.current.profile).toBeDefined());
    expect(result.current.profile?.session_id).toBe("session-1");
    expect(result.current.isError).toBe(false);
  });

  it("surfaces an error state when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })),
    );

    const { result } = renderHook(() => useSessionInsights("missing-session"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.profile).toBeUndefined();
  });
});
