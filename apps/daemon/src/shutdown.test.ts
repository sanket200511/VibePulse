import { describe, it, expect, vi, beforeEach } from "vitest";
import { createShutdownHandler } from "./shutdown";
import { EventType } from "./event-types";

describe("Graceful Shutdown", () => {
  const gate = {
    isOpen: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
  };
  const watcher = {
    start: vi.fn(),
    stop: vi.fn(),
  };
  const publisher = {
    publish: vi.fn(),
    publishCritical: vi.fn(),
  };
  const healthServer = {
    listen: vi.fn(),
    close: vi.fn(),
  };
  const drainQueue = vi.fn();
  const exitProcess = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should perform graceful shutdown when observing", async () => {
    gate.isOpen.mockReturnValue(true);
    drainQueue.mockResolvedValue(undefined);
    publisher.publishCritical.mockResolvedValue(undefined);

    const shutdown = createShutdownHandler({
      gate,
      watcher,
      publisher,
      healthServer,
      drainQueue,
      sessionId: "test-session",
      watchRoot: "/test-root",
      exitProcess,
    });

    await shutdown("SIGINT");

    expect(gate.isOpen).toHaveBeenCalled();
    expect(gate.close).toHaveBeenCalled();
    expect(watcher.stop).toHaveBeenCalled();
    expect(drainQueue).toHaveBeenCalled();
    expect(publisher.publishCritical).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: EventType.OBSERVATION_STOPPED,
        session_id: "test-session",
        project_root: "/test-root",
      }),
    );
    expect(healthServer.close).toHaveBeenCalled();
    expect(exitProcess).toHaveBeenCalledWith(0);
  });

  it("should not emit terminal boundary if observation was stopped", async () => {
    gate.isOpen.mockReturnValue(false);
    drainQueue.mockResolvedValue(undefined);

    const shutdown = createShutdownHandler({
      gate,
      watcher,
      publisher,
      healthServer,
      drainQueue,
      sessionId: "test-session",
      watchRoot: "/test-root",
      exitProcess,
    });

    await shutdown("SIGINT");

    expect(gate.isOpen).toHaveBeenCalled();
    expect(gate.close).toHaveBeenCalled();
    expect(watcher.stop).toHaveBeenCalled();
    expect(drainQueue).toHaveBeenCalled();
    expect(publisher.publishCritical).not.toHaveBeenCalled();
    expect(healthServer.close).toHaveBeenCalled();
    expect(exitProcess).toHaveBeenCalledWith(0);
  });

  it("should ignore duplicate shutdown signals", async () => {
    gate.isOpen.mockReturnValue(true);
    drainQueue.mockResolvedValue(undefined);
    publisher.publishCritical.mockResolvedValue(undefined);

    const shutdown = createShutdownHandler({
      gate,
      watcher,
      publisher,
      healthServer,
      drainQueue,
      sessionId: "test-session",
      watchRoot: "/test-root",
      exitProcess,
    });

    await shutdown("SIGINT");
    await shutdown("SIGINT");
    await shutdown("SIGTERM");

    expect(watcher.stop).toHaveBeenCalledTimes(1);
    expect(exitProcess).toHaveBeenCalledTimes(1);
  });

  it("should not hang if drainQueue throws", async () => {
    gate.isOpen.mockReturnValue(true);
    drainQueue.mockRejectedValue(new Error("Queue error"));
    publisher.publishCritical.mockResolvedValue(undefined);

    const shutdown = createShutdownHandler({
      gate,
      watcher,
      publisher,
      healthServer,
      drainQueue,
      sessionId: "test-session",
      watchRoot: "/test-root",
      exitProcess,
    });

    await shutdown("SIGINT");

    expect(publisher.publishCritical).toHaveBeenCalled();
    expect(exitProcess).toHaveBeenCalledWith(0);
  });

  it("should not hang if API transport fails on critical event", async () => {
    gate.isOpen.mockReturnValue(true);
    drainQueue.mockResolvedValue(undefined);
    publisher.publishCritical.mockRejectedValue(new Error("API offline"));

    const shutdown = createShutdownHandler({
      gate,
      watcher,
      publisher,
      healthServer,
      drainQueue,
      sessionId: "test-session",
      watchRoot: "/test-root",
      exitProcess,
    });

    await shutdown("SIGINT");

    expect(publisher.publishCritical).toHaveBeenCalled();
    expect(healthServer.close).toHaveBeenCalled();
    expect(exitProcess).toHaveBeenCalledWith(0);
  });
});
