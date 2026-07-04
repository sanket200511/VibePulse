import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { FakeWebSocket } from "../../test/fake-websocket";
import { useEventsFeed } from "./useEventsFeed";
import type { DevelopmentEvent } from "./types";

function makeEvent(id: string): DevelopmentEvent {
  return {
    id,
    schema_version: 1,
    event_type: "FILE_MODIFIED",
    timestamp: "2026-07-04T00:00:00Z",
    session_id: "session-1",
    project_root: "/repo",
    file_path: "/repo/src/index.ts",
    file_name: "index.ts",
    file_extension: "ts",
    language: "typescript",
    git_branch: "main",
    metadata: {},
    created_at: "2026-07-04T00:00:00Z",
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
      json: async () => ({ events: [makeEvent("initial-1")] }),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useEventsFeed", () => {
  it("loads the initial events and opens a WebSocket subscription", async () => {
    const { result } = renderHook(() => useEventsFeed(), { wrapper });

    await waitFor(() => expect(result.current.events).toHaveLength(1));
    expect(result.current.events[0]?.id).toBe("initial-1");
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("prepends new events received over the WebSocket", async () => {
    const { result } = renderHook(() => useEventsFeed(), { wrapper });
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    act(() => {
      FakeWebSocket.latest().emitMessage(JSON.stringify(makeEvent("live-1")));
    });

    expect(result.current.events.map((event) => event.id)).toEqual(["live-1", "initial-1"]);
  });

  it("deduplicates events already seen, whether from the initial load or the socket", async () => {
    const { result } = renderHook(() => useEventsFeed(), { wrapper });
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    act(() => {
      FakeWebSocket.latest().emitMessage(JSON.stringify(makeEvent("initial-1")));
    });
    expect(result.current.events).toHaveLength(1);

    act(() => {
      FakeWebSocket.latest().emitMessage(JSON.stringify(makeEvent("live-1")));
    });
    act(() => {
      FakeWebSocket.latest().emitMessage(JSON.stringify(makeEvent("live-1")));
    });
    expect(result.current.events.filter((event) => event.id === "live-1")).toHaveLength(1);
  });

  it("caps the feed at 200 events, dropping the oldest first", async () => {
    const { result } = renderHook(() => useEventsFeed(), { wrapper });
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    act(() => {
      for (let i = 0; i < 200; i += 1) {
        FakeWebSocket.latest().emitMessage(JSON.stringify(makeEvent(`live-${i}`)));
      }
    });

    expect(result.current.events).toHaveLength(200);
    // The very first live event pushed the original "initial-1" out of the window.
    expect(result.current.events.some((event) => event.id === "initial-1")).toBe(false);
    // Most recent event stays at the front.
    expect(result.current.events[0]?.id).toBe("live-199");
  });

  it("ignores malformed WebSocket payloads without crashing or changing the feed", async () => {
    const { result } = renderHook(() => useEventsFeed(), { wrapper });
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    act(() => {
      FakeWebSocket.latest().emitMessage("not valid json{{{");
    });

    expect(result.current.events).toHaveLength(1);
  });

  it("tracks connection status through open and disconnect", async () => {
    const { result, unmount } = renderHook(() => useEventsFeed(), { wrapper });
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    expect(result.current.connectionStatus).toBe("connecting");

    act(() => {
      FakeWebSocket.latest().emitOpen();
    });
    expect(result.current.connectionStatus).toBe("open");

    act(() => {
      FakeWebSocket.latest().close();
    });
    expect(result.current.connectionStatus).toBe("closed");

    // Unmounting must close the socket rather than leaving it to reconnect.
    unmount();
    expect(FakeWebSocket.latest().closed).toBe(true);
  });
});
