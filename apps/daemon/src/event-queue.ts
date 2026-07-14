/**
 * In-Memory Event Queue.
 *
 * Holds publish-ready, debounced events during transient API outages.
 * The queue is the sole resilience buffer between the debouncer and the
 * publisher.
 *
 * Responsibilities:
 *   - FIFO ordering of publish-ready events
 *   - Capacity enforcement (reject newest on overflow)
 *   - Invoke onOverflow callback when an event is rejected
 *
 * Explicitly NOT responsible for:
 *   - Logging (caller logs via onOverflow)
 *   - Publishing events
 *   - Retry logic
 *   - Debouncing
 *   - Any I/O
 *
 * Overflow policy:
 *   When the queue is at capacity, the INCOMING event is rejected.
 *   Existing events are never removed. This preserves the observation
 *   window origin — the beginning of a window is more valuable than its tail.
 */

import type { DevelopmentEvent } from "./event-types";

export interface EventQueueOptions {
  /** Maximum number of events the queue will hold. */
  maxSize: number;
  /** Called with the rejected event when a new event cannot be enqueued. */
  onOverflow: (rejected: DevelopmentEvent) => void;
}

export interface EventQueue {
  /**
   * Adds an event to the queue.
   * @returns true if enqueued, false if rejected due to capacity.
   */
  enqueue(event: DevelopmentEvent): boolean;
  /**
   * Removes and returns the oldest event, or undefined if the queue is empty.
   */
  dequeue(): DevelopmentEvent | undefined;
  /** Current number of events in the queue. */
  size(): number;
  /** True when the queue contains no events. */
  isEmpty(): boolean;
}

export function createEventQueue({ maxSize, onOverflow }: EventQueueOptions): EventQueue {
  const items: DevelopmentEvent[] = [];

  return {
    enqueue(event: DevelopmentEvent): boolean {
      if (items.length >= maxSize) {
        onOverflow(event);
        return false;
      }
      items.push(event);
      return true;
    },

    dequeue(): DevelopmentEvent | undefined {
      return items.shift();
    },

    size(): number {
      return items.length;
    },

    isEmpty(): boolean {
      return items.length === 0;
    },
  };
}
