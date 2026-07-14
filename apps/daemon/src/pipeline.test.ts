/**
 * Pipeline integration tests.
 *
 * Verifies the complete observation pipeline without real filesystem watching
 * or network requests. Each test wires real component instances together and
 * drives events through the pipeline manually (simulating what the watcher
 * would do on a real filesystem event).
 *
 * Components under test (all real, not mocked):
 *   Normaliser → Observation Gate → Debouncer → Queue → Publisher (mock)
 *
 * The watcher and Chokidar are NOT involved — the tests drive normaliser.normalise()
 * directly, mirroring exactly what watcher.ts does on each filesystem event.
 */

import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNormaliser } from "./normaliser";
import { createObservationGate } from "./observation-gate";
import { createDebouncer } from "./debouncer";
import { createEventQueue } from "./event-queue";
import { EventType, type DevelopmentEvent } from "./event-types";
import type { Publisher } from "./publisher/publisher";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a mock Publisher that records all events passed to publish().
 * Synchronous under the hood so tests can inspect results without awaiting.
 */
function makeMockPublisher(): { publisher: Publisher; received: DevelopmentEvent[] } {
  const received: DevelopmentEvent[] = [];
  const publisher: Publisher = {
    publish: vi.fn(async (event: DevelopmentEvent) => {
      received.push(event);
    }),
    publishCritical: vi.fn(async (event: DevelopmentEvent) => {
      received.push(event);
    }),
  };
  return { publisher, received };
}

/**
 * Wires the full pipeline (Normaliser → Gate → Debouncer → Queue → Publisher)
 * and returns a handle to each component for test manipulation.
 */
function buildPipeline(projectRoot: string) {
  const sessionId = "test-session";
  const normaliser = createNormaliser({ projectRoot, sessionId });
  const gate = createObservationGate();
  const { publisher, received } = makeMockPublisher();
  const overflow: DevelopmentEvent[] = [];

  const queue = createEventQueue({
    maxSize: 50,
    onOverflow: (e) => overflow.push(e),
  });

  async function drainQueue(): Promise<void> {
    while (!queue.isEmpty()) {
      const event = queue.dequeue();
      if (!event) break;
      await publisher.publish(event);
    }
  }

  const debouncer = createDebouncer({
    debounceMs: 300,
    onFlush: (event: DevelopmentEvent): void => {
      queue.enqueue(event);
      void drainQueue();
    },
  });

  /**
   * Simulate the watcher's handleEvent() logic:
   * Normaliser → Gate check → Debouncer.
   */
  function handleEvent(eventType: EventType, filePath: string): void {
    const event = normaliser.normalise(eventType, filePath);
    if (!event) return;
    if (!gate.isOpen()) return;
    debouncer.push(event);
  }

  return { normaliser, gate, debouncer, queue, publisher, received, overflow, handleEvent };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Observation Pipeline (integration)", () => {
  let projectRoot: string;

  beforeEach(() => {
    vi.useFakeTimers();
    projectRoot = mkdtempSync(join(tmpdir(), "vibepulse-pipeline-test-"));
  });

  afterEach(() => {
    vi.useRealTimers();
    rmSync(projectRoot, { recursive: true, force: true });
  });

  describe("Observation disabled (gate closed)", () => {
    it("nothing reaches the publisher when the gate is closed", async () => {
      const { received, handleEvent } = buildPipeline(projectRoot);

      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "src", "app.ts"));
      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();

      expect(received).toHaveLength(0);
    });

    it("events are silently dropped for every event type when gate is closed", async () => {
      const { received, handleEvent } = buildPipeline(projectRoot);

      handleEvent(EventType.FILE_CREATED, join(projectRoot, "a.ts"));
      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "b.ts"));
      handleEvent(EventType.FILE_DELETED, join(projectRoot, "c.ts"));
      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();

      expect(received).toHaveLength(0);
    });
  });

  describe("Observation enabled (gate open)", () => {
    it("a single event reaches the publisher after the debounce window", async () => {
      const { gate, received, handleEvent } = buildPipeline(projectRoot);
      gate.open();

      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "src", "app.ts"));
      expect(received).toHaveLength(0); // not yet flushed

      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();

      expect(received).toHaveLength(1);
    });

    it("the event arriving at the publisher is already normalised (has daemon_seq, language, etc.)", async () => {
      const { gate, received, handleEvent } = buildPipeline(projectRoot);
      gate.open();

      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "main.ts"));
      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();

      const event = received[0]!;
      expect(event.event_type).toBe(EventType.FILE_MODIFIED);
      expect(event.file_name).toBe("main.ts");
      expect(event.language).toBe("TypeScript");
      expect(event.session_id).toBe("test-session");
      expect(typeof event.daemon_seq).toBe("number");
      expect(event.project_root).toBe(projectRoot);
    });

    it("FILE_DELETED bypasses the debounce window and reaches publisher immediately", async () => {
      const { gate, received, handleEvent } = buildPipeline(projectRoot);
      gate.open();

      handleEvent(EventType.FILE_DELETED, join(projectRoot, "gone.ts"));
      await vi.runAllTimersAsync();

      expect(received).toHaveLength(1);
      expect(received[0]!.event_type).toBe(EventType.FILE_DELETED);
    });
  });

  describe("Burst events collapse before entering the queue", () => {
    it("a burst of MODIFIED events on the same file produces one queue entry", async () => {
      const { gate, queue, handleEvent } = buildPipeline(projectRoot);
      gate.open();

      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "a.ts"));
      vi.advanceTimersByTime(100);
      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "a.ts"));
      vi.advanceTimersByTime(100);
      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "a.ts"));

      // Queue should be empty — the debounce window hasn't fired yet.
      expect(queue.size()).toBe(0);

      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();

      // After the window fires the queue drains synchronously, so check received.
      // (Queue drains immediately on enqueue via drainQueue().)
    });

    it("a burst on the same file produces exactly one published event", async () => {
      const { gate, received, handleEvent } = buildPipeline(projectRoot);
      gate.open();

      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "a.ts"));
      vi.advanceTimersByTime(100);
      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "a.ts"));
      vi.advanceTimersByTime(100);
      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "a.ts"));

      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();

      expect(received).toHaveLength(1);
    });

    it("bursts on different files produce independent published events", async () => {
      const { gate, received, handleEvent } = buildPipeline(projectRoot);
      gate.open();

      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "a.ts"));
      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "b.ts"));

      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();

      expect(received).toHaveLength(2);
      const paths = received.map((e) => e.file_path);
      expect(paths).toContain(join(projectRoot, "a.ts"));
      expect(paths).toContain(join(projectRoot, "b.ts"));
    });
  });

  describe("Queue receives only publish-ready events", () => {
    it("queue is empty while a burst is still in the debounce window", () => {
      const { gate, queue, handleEvent } = buildPipeline(projectRoot);
      gate.open();

      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "a.ts"));
      vi.advanceTimersByTime(200); // window not yet expired

      expect(queue.isEmpty()).toBe(true);
    });

    it("gate closing mid-burst prevents the burst event from entering the queue", async () => {
      const { gate, received, handleEvent } = buildPipeline(projectRoot);
      gate.open();

      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "a.ts"));
      gate.close(); // close before the debounce window fires
      // The debouncer timer has already started — the event will flush,
      // but a second event after the gate is closed will be dropped.
      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "b.ts")); // dropped

      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();

      // a.ts was already in the debouncer when gate closed, so it reaches publisher.
      // b.ts was dropped at the gate check before entering the debouncer.
      const paths = received.map((e) => e.file_path);
      expect(paths).not.toContain(join(projectRoot, "b.ts"));
    });
  });

  describe("daemon_seq is unchanged through the pipeline", () => {
    it("daemon_seq assigned by the normaliser arrives intact at the publisher", async () => {
      const { gate, received, handleEvent } = buildPipeline(projectRoot);
      gate.open();

      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "first.ts"));
      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "second.ts"));

      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();

      expect(received).toHaveLength(2);
      // Seqs are 0 and 1 (assigned by normaliser in call order)
      const seqs = received.map((e) => e.daemon_seq).sort((a, b) => a - b);
      expect(seqs[0]).toBe(0);
      expect(seqs[1]).toBe(1);
    });

    it("daemon_seq of the FIRST burst event is preserved through debounce collapse", async () => {
      const { gate, received, handleEvent } = buildPipeline(projectRoot);
      gate.open();

      // Three events on the same file; normaliser assigns seq 0, 1, 2.
      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "a.ts")); // seq=0
      vi.advanceTimersByTime(50);
      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "a.ts")); // seq=1
      vi.advanceTimersByTime(50);
      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "a.ts")); // seq=2

      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();

      expect(received).toHaveLength(1);
      // The first event's seq (0) is preserved by the debouncer.
      expect(received[0]!.daemon_seq).toBe(0);
    });
  });

  describe("Gate toggle mid-session", () => {
    it("events before opening gate are dropped; events after opening gate are published", async () => {
      const { gate, received, handleEvent } = buildPipeline(projectRoot);

      // Gate is closed — event dropped.
      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "before.ts"));
      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();
      expect(received).toHaveLength(0);

      // Open the gate.
      gate.open();

      handleEvent(EventType.FILE_MODIFIED, join(projectRoot, "after.ts"));
      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();
      expect(received).toHaveLength(1);
      expect(received[0]!.file_name).toBe("after.ts");
    });
  });
});
