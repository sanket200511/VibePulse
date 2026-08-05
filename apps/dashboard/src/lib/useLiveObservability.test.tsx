import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLiveObservability } from "./useLiveObservability";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { connectWs } from "./ws-client";
import { toast } from "../components/ui/ToastProvider";

vi.mock("./ws-client", () => ({
  connectWs: vi.fn(),
}));

describe("useLiveObservability", () => {
  let queryClient: QueryClient;
  let mockOnMessage: (data: Record<string, unknown>) => void;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    // Capture the onMessage callback from the events websocket
    vi.mocked(connectWs).mockImplementation((opts) => {
      if (opts.url.includes("/ws/events")) {
        mockOnMessage = opts.onMessage;
      }
      return { close: vi.fn() };
    });
  });

  it("handles ANALYSIS_COMPLETE by appending intelligently and triggering toast", async () => {
    const toastSpy = vi.spyOn(toast, "emit");

    renderHook(() => useLiveObservability(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    // Pre-populate cache
    queryClient.setQueryData(["session_architecture", "session-123"], {
      session_id: "session-123",
      entries: [{ id: "old-1" }],
    });

    // Fire ANALYSIS_COMPLETE
    mockOnMessage({
      type: "ANALYSIS_COMPLETE",
      session_id: "session-123",
      event_id: "event-456",
      entries: [
        { id: "new-1", title: "Function Added", description: "foo", kind: "CODE_EVOLUTION" },
        { id: "new-2", title: "API Key", description: "Exposed", kind: "SECURITY_FINDING" },
      ],
    });

    // 1. Toast generated (async dynamic import)
    await vi.waitFor(() => {
      expect(toastSpy).toHaveBeenCalledTimes(2);
    });

    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Function Added", type: "ARCH" }),
    );
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: "API Key", type: "SECURITY" }),
    );

    // 2. Intelligently appends
    expect(setQueryDataSpy).toHaveBeenCalledWith(
      ["session_architecture", "session-123"],
      expect.any(Function),
    );

    const updatedData = queryClient.getQueryData(["session_architecture", "session-123"]) as
      { entries: { id: string }[] } | undefined;
    expect(updatedData?.entries.length).toBe(3); // 1 old + 2 new
    expect(updatedData?.entries?.[1]?.id).toBe("new-1");

    // 3. Workspace updates indirectly without clobbering timeline
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["project_architecture"] }),
    );
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["sessions", "session-123", "replay"] }),
    );
  });
});
