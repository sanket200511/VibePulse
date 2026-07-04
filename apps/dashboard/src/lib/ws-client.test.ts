import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeWebSocket } from "../test/fake-websocket";
import { connectWs } from "./ws-client";

beforeEach(() => {
  FakeWebSocket.reset();
  vi.stubGlobal("WebSocket", FakeWebSocket);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("connectWs", () => {
  it("connects immediately and reports status transitions", () => {
    const onStatusChange = vi.fn();
    connectWs({ url: "ws://test/ws/events", onMessage: vi.fn(), onStatusChange });

    expect(onStatusChange).toHaveBeenCalledWith("connecting");

    FakeWebSocket.latest().emitOpen();
    expect(onStatusChange).toHaveBeenCalledWith("open");
  });

  it("delivers parsed JSON messages to onMessage", () => {
    const onMessage = vi.fn();
    connectWs({ url: "ws://test/ws/events", onMessage });

    FakeWebSocket.latest().emitMessage(JSON.stringify({ id: "evt-1" }));

    expect(onMessage).toHaveBeenCalledWith({ id: "evt-1" });
  });

  it("ignores malformed (non-JSON) payloads without throwing", () => {
    const onMessage = vi.fn();
    connectWs({ url: "ws://test/ws/events", onMessage });

    expect(() => FakeWebSocket.latest().emitMessage("not json{{{")).not.toThrow();
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("reconnects with exponential backoff after the socket closes", () => {
    const onStatusChange = vi.fn();
    connectWs({ url: "ws://test/ws/events", onMessage: vi.fn(), onStatusChange });

    FakeWebSocket.latest().emitOpen();
    FakeWebSocket.latest().close();
    expect(onStatusChange).toHaveBeenLastCalledWith("closed");
    expect(FakeWebSocket.instances).toHaveLength(1);

    // First retry waits the base delay (500ms) — not before, not instantly.
    vi.advanceTimersByTime(499);
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(2);

    // Second retry backs off further (1000ms), doubling from the first.
    FakeWebSocket.latest().close();
    vi.advanceTimersByTime(999);
    expect(FakeWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it("resets the backoff attempt counter once a connection opens", () => {
    connectWs({ url: "ws://test/ws/events", onMessage: vi.fn() });

    FakeWebSocket.latest().emitOpen();
    FakeWebSocket.latest().close(); // attempt 0 -> schedules at 500ms, attempt becomes 1
    vi.advanceTimersByTime(500);
    expect(FakeWebSocket.instances).toHaveLength(2);

    // Reconnected socket opens successfully, so the counter should reset to 0.
    FakeWebSocket.latest().emitOpen();
    FakeWebSocket.latest().close();
    vi.advanceTimersByTime(500);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it("does not reconnect once the caller closes the client intentionally", () => {
    const client = connectWs({ url: "ws://test/ws/events", onMessage: vi.fn() });

    client.close();
    expect(FakeWebSocket.latest().closed).toBe(true);

    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("closes the socket on error, which triggers the normal reconnect path", () => {
    connectWs({ url: "ws://test/ws/events", onMessage: vi.fn() });

    FakeWebSocket.latest().emitError();
    expect(FakeWebSocket.latest().closed).toBe(true);
  });
});
