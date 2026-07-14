import { describe, expect, it, vi } from "vitest";
import { createEventQueue } from "./event-queue";
import { EventType, CURRENT_SCHEMA_VERSION, type DevelopmentEvent } from "./event-types";

function makeEvent(seq: number, filePath = "/project/a.ts"): DevelopmentEvent {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    event_type: EventType.FILE_MODIFIED,
    timestamp: "2026-07-13T10:00:00.000Z",
    session_id: "sess-1",
    project_root: "/project",
    file_path: filePath,
    file_name: "a.ts",
    metadata: {},
    daemon_seq: seq,
  };
}

describe("createEventQueue", () => {
  describe("initial state", () => {
    it("is empty on creation", () => {
      const queue = createEventQueue({ maxSize: 10, onOverflow: () => {} });
      expect(queue.isEmpty()).toBe(true);
      expect(queue.size()).toBe(0);
    });
  });

  describe("enqueue / dequeue", () => {
    it("enqueues an event and returns true", () => {
      const queue = createEventQueue({ maxSize: 10, onOverflow: () => {} });
      const result = queue.enqueue(makeEvent(0));
      expect(result).toBe(true);
      expect(queue.size()).toBe(1);
    });

    it("dequeues events in FIFO order", () => {
      const queue = createEventQueue({ maxSize: 10, onOverflow: () => {} });
      queue.enqueue(makeEvent(0));
      queue.enqueue(makeEvent(1));
      queue.enqueue(makeEvent(2));

      expect(queue.dequeue()!.daemon_seq).toBe(0);
      expect(queue.dequeue()!.daemon_seq).toBe(1);
      expect(queue.dequeue()!.daemon_seq).toBe(2);
    });

    it("returns undefined when dequeuing from an empty queue", () => {
      const queue = createEventQueue({ maxSize: 10, onOverflow: () => {} });
      expect(queue.dequeue()).toBeUndefined();
    });

    it("isEmpty() returns false after enqueue, true after draining", () => {
      const queue = createEventQueue({ maxSize: 10, onOverflow: () => {} });
      queue.enqueue(makeEvent(0));
      expect(queue.isEmpty()).toBe(false);
      queue.dequeue();
      expect(queue.isEmpty()).toBe(true);
    });

    it("size() tracks enqueue and dequeue accurately", () => {
      const queue = createEventQueue({ maxSize: 10, onOverflow: () => {} });
      queue.enqueue(makeEvent(0));
      queue.enqueue(makeEvent(1));
      expect(queue.size()).toBe(2);
      queue.dequeue();
      expect(queue.size()).toBe(1);
    });
  });

  describe("overflow — reject newest policy", () => {
    it("returns false and does not enqueue when at capacity", () => {
      const queue = createEventQueue({ maxSize: 2, onOverflow: () => {} });
      queue.enqueue(makeEvent(0));
      queue.enqueue(makeEvent(1));

      const result = queue.enqueue(makeEvent(2));
      expect(result).toBe(false);
      expect(queue.size()).toBe(2);
    });

    it("calls onOverflow with the REJECTED (newest) event", () => {
      const overflowed: DevelopmentEvent[] = [];
      const queue = createEventQueue({ maxSize: 1, onOverflow: (e) => overflowed.push(e) });
      queue.enqueue(makeEvent(0));

      const rejected = makeEvent(99);
      queue.enqueue(rejected);

      expect(overflowed).toHaveLength(1);
      expect(overflowed[0]!.daemon_seq).toBe(99);
    });

    it("never removes existing events when overflow occurs", () => {
      const queue = createEventQueue({ maxSize: 2, onOverflow: () => {} });
      queue.enqueue(makeEvent(0));
      queue.enqueue(makeEvent(1));
      queue.enqueue(makeEvent(2)); // rejected

      // Oldest events are intact
      expect(queue.dequeue()!.daemon_seq).toBe(0);
      expect(queue.dequeue()!.daemon_seq).toBe(1);
    });

    it("onOverflow is called for every rejected event independently", () => {
      const overflowCount = { calls: 0 };
      const queue = createEventQueue({ maxSize: 1, onOverflow: () => overflowCount.calls++ });
      queue.enqueue(makeEvent(0));
      queue.enqueue(makeEvent(1)); // overflow
      queue.enqueue(makeEvent(2)); // overflow

      expect(overflowCount.calls).toBe(2);
    });

    it("can enqueue again after dequeuing below capacity", () => {
      const queue = createEventQueue({ maxSize: 2, onOverflow: () => {} });
      queue.enqueue(makeEvent(0));
      queue.enqueue(makeEvent(1));
      queue.dequeue(); // free one slot
      const result = queue.enqueue(makeEvent(2));
      expect(result).toBe(true);
      expect(queue.size()).toBe(2);
    });

    it("onOverflow is not called when enqueuing within capacity", () => {
      const overflow = vi.fn();
      const queue = createEventQueue({ maxSize: 5, onOverflow: overflow });
      queue.enqueue(makeEvent(0));
      queue.enqueue(makeEvent(1));
      expect(overflow).not.toHaveBeenCalled();
    });
  });
});
