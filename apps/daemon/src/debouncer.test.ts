import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDebouncer } from "./debouncer";
import { EventType, CURRENT_SCHEMA_VERSION, type DevelopmentEvent } from "./event-types";

function makeEvent(overrides: Partial<DevelopmentEvent> & { file_path: string }): DevelopmentEvent {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    event_type: EventType.FILE_MODIFIED,
    timestamp: "2026-07-13T10:00:00.000Z",
    session_id: "sess-1",
    project_root: "/project",
    file_name: "file.ts",
    file_extension: ".ts",
    language: "TypeScript",
    metadata: {},
    daemon_seq: 0,
    ...overrides,
  };
}

describe("createDebouncer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("single event", () => {
    it("flushes a single event after the debounce window", () => {
      const flushed: DevelopmentEvent[] = [];
      const debouncer = createDebouncer({ debounceMs: 300, onFlush: (e) => flushed.push(e) });

      debouncer.push(makeEvent({ file_path: "/project/a.ts" }));
      expect(flushed).toHaveLength(0);

      vi.advanceTimersByTime(300);
      expect(flushed).toHaveLength(1);
      expect(flushed[0]!.file_path).toBe("/project/a.ts");
    });

    it("does not flush before the debounce window expires", () => {
      const flushed: DevelopmentEvent[] = [];
      const debouncer = createDebouncer({ debounceMs: 300, onFlush: (e) => flushed.push(e) });

      debouncer.push(makeEvent({ file_path: "/project/a.ts" }));
      vi.advanceTimersByTime(299);
      expect(flushed).toHaveLength(0);
    });
  });

  describe("burst collapse", () => {
    it("collapses a burst on the same file into one flush", () => {
      const flushed: DevelopmentEvent[] = [];
      const debouncer = createDebouncer({ debounceMs: 300, onFlush: (e) => flushed.push(e) });

      debouncer.push(makeEvent({ file_path: "/project/a.ts", daemon_seq: 0 }));
      vi.advanceTimersByTime(100);
      debouncer.push(makeEvent({ file_path: "/project/a.ts", daemon_seq: 1 }));
      vi.advanceTimersByTime(100);
      debouncer.push(makeEvent({ file_path: "/project/a.ts", daemon_seq: 2 }));

      vi.advanceTimersByTime(300);
      expect(flushed).toHaveLength(1);
    });

    it("preserves the timestamp of the FIRST event in the burst", () => {
      const flushed: DevelopmentEvent[] = [];
      const debouncer = createDebouncer({ debounceMs: 300, onFlush: (e) => flushed.push(e) });
      const firstTimestamp = "2026-07-13T10:00:00.000Z";
      const laterTimestamp = "2026-07-13T10:00:00.100Z";

      debouncer.push(
        makeEvent({ file_path: "/project/a.ts", timestamp: firstTimestamp, daemon_seq: 0 }),
      );
      vi.advanceTimersByTime(100);
      debouncer.push(
        makeEvent({ file_path: "/project/a.ts", timestamp: laterTimestamp, daemon_seq: 1 }),
      );

      vi.advanceTimersByTime(300);
      expect(flushed[0]!.timestamp).toBe(firstTimestamp);
    });

    it("preserves the daemon_seq of the FIRST event in the burst", () => {
      const flushed: DevelopmentEvent[] = [];
      const debouncer = createDebouncer({ debounceMs: 300, onFlush: (e) => flushed.push(e) });

      debouncer.push(makeEvent({ file_path: "/project/a.ts", daemon_seq: 5 }));
      vi.advanceTimersByTime(50);
      debouncer.push(makeEvent({ file_path: "/project/a.ts", daemon_seq: 6 }));

      vi.advanceTimersByTime(300);
      expect(flushed[0]!.daemon_seq).toBe(5);
    });

    it("emits the event_type of the LAST event in the burst", () => {
      const flushed: DevelopmentEvent[] = [];
      const debouncer = createDebouncer({ debounceMs: 300, onFlush: (e) => flushed.push(e) });

      debouncer.push(makeEvent({ file_path: "/project/a.ts", event_type: EventType.FILE_CREATED }));
      vi.advanceTimersByTime(50);
      debouncer.push(
        makeEvent({ file_path: "/project/a.ts", event_type: EventType.FILE_MODIFIED }),
      );

      vi.advanceTimersByTime(300);
      expect(flushed[0]!.event_type).toBe(EventType.FILE_MODIFIED);
    });

    it("resets the window each time a new burst event arrives", () => {
      const flushed: DevelopmentEvent[] = [];
      const debouncer = createDebouncer({ debounceMs: 300, onFlush: (e) => flushed.push(e) });

      debouncer.push(makeEvent({ file_path: "/project/a.ts" }));
      vi.advanceTimersByTime(250); // not yet expired
      debouncer.push(makeEvent({ file_path: "/project/a.ts" })); // resets window
      vi.advanceTimersByTime(250); // still not expired from reset
      expect(flushed).toHaveLength(0);
      vi.advanceTimersByTime(50); // now expires (250 + 50 = 300 from last event)
      expect(flushed).toHaveLength(1);
    });
  });

  describe("multiple files", () => {
    it("debounces events on different files independently", () => {
      const flushed: DevelopmentEvent[] = [];
      const debouncer = createDebouncer({ debounceMs: 300, onFlush: (e) => flushed.push(e) });

      debouncer.push(makeEvent({ file_path: "/project/a.ts" }));
      debouncer.push(makeEvent({ file_path: "/project/b.ts" }));

      vi.advanceTimersByTime(300);
      expect(flushed).toHaveLength(2);
      const paths = flushed.map((e) => e.file_path);
      expect(paths).toContain("/project/a.ts");
      expect(paths).toContain("/project/b.ts");
    });

    it("a burst on one file does not affect the timer of another file", () => {
      const flushed: DevelopmentEvent[] = [];
      const debouncer = createDebouncer({ debounceMs: 300, onFlush: (e) => flushed.push(e) });

      debouncer.push(makeEvent({ file_path: "/project/a.ts" }));
      debouncer.push(makeEvent({ file_path: "/project/b.ts" }));
      vi.advanceTimersByTime(100);
      debouncer.push(makeEvent({ file_path: "/project/a.ts" })); // resets a.ts only

      vi.advanceTimersByTime(200);
      // b.ts should have flushed (200 ms after the 100 ms mark = 300 ms total)
      expect(flushed.some((e) => e.file_path === "/project/b.ts")).toBe(true);
      // a.ts should NOT have flushed yet (100 ms after its reset)
      expect(flushed.some((e) => e.file_path === "/project/a.ts")).toBe(false);

      vi.advanceTimersByTime(100);
      expect(flushed.some((e) => e.file_path === "/project/a.ts")).toBe(true);
    });
  });

  describe("FILE_DELETED bypass", () => {
    it("emits FILE_DELETED immediately without waiting for the window", () => {
      const flushed: DevelopmentEvent[] = [];
      const debouncer = createDebouncer({ debounceMs: 300, onFlush: (e) => flushed.push(e) });

      debouncer.push(makeEvent({ file_path: "/project/a.ts", event_type: EventType.FILE_DELETED }));
      // No timer advance — should be emitted synchronously
      expect(flushed).toHaveLength(1);
      expect(flushed[0]!.event_type).toBe(EventType.FILE_DELETED);
    });

    it("FILE_DELETED cancels pending debounce state for the same path before being emitted", () => {
      const flushed: DevelopmentEvent[] = [];
      const debouncer = createDebouncer({ debounceMs: 300, onFlush: (e) => flushed.push(e) });

      // Start a pending MODIFIED burst, then DELETE the file
      debouncer.push(
        makeEvent({ file_path: "/project/a.ts", event_type: EventType.FILE_MODIFIED }),
      );
      debouncer.push(makeEvent({ file_path: "/project/a.ts", event_type: EventType.FILE_DELETED }));

      // DELETE already emitted immediately
      expect(flushed).toHaveLength(1);
      expect(flushed[0]!.event_type).toBe(EventType.FILE_DELETED);

      // The pending MODIFIED timer was cancelled, so it does NOT fire
      vi.advanceTimersByTime(300);
      expect(flushed).toHaveLength(1);
    });
  });

  describe("flush()", () => {
    it("synchronously emits all pending events", () => {
      const flushed: DevelopmentEvent[] = [];
      const debouncer = createDebouncer({ debounceMs: 300, onFlush: (e) => flushed.push(e) });

      debouncer.push(makeEvent({ file_path: "/project/a.ts" }));
      debouncer.push(makeEvent({ file_path: "/project/b.ts" }));

      // Not yet expired
      expect(flushed).toHaveLength(0);
      debouncer.flush();
      expect(flushed).toHaveLength(2);
    });

    it("clears all pending timers so they do not fire after flush()", () => {
      const flushed: DevelopmentEvent[] = [];
      const debouncer = createDebouncer({ debounceMs: 300, onFlush: (e) => flushed.push(e) });

      debouncer.push(makeEvent({ file_path: "/project/a.ts" }));
      debouncer.flush();
      const countAfterFlush = flushed.length;

      vi.advanceTimersByTime(300);
      // Timer must not fire again
      expect(flushed.length).toBe(countAfterFlush);
    });

    it("is safe to call when no events are pending", () => {
      const debouncer = createDebouncer({ debounceMs: 300, onFlush: () => {} });
      expect(() => debouncer.flush()).not.toThrow();
    });

    it("preserves burst-collapse semantics (first timestamp) when flushed early", () => {
      const flushed: DevelopmentEvent[] = [];
      const debouncer = createDebouncer({ debounceMs: 300, onFlush: (e) => flushed.push(e) });
      const firstTs = "2026-07-13T10:00:00.000Z";

      debouncer.push(makeEvent({ file_path: "/project/a.ts", timestamp: firstTs, daemon_seq: 0 }));
      vi.advanceTimersByTime(50);
      debouncer.push(
        makeEvent({
          file_path: "/project/a.ts",
          timestamp: "2026-07-13T10:00:00.050Z",
          daemon_seq: 1,
          event_type: EventType.FILE_MODIFIED,
        }),
      );

      debouncer.flush();
      expect(flushed[0]!.timestamp).toBe(firstTs);
      expect(flushed[0]!.daemon_seq).toBe(0);
      expect(flushed[0]!.event_type).toBe(EventType.FILE_MODIFIED);
    });
  });
});
