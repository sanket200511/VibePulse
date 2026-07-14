/**
 * Debouncer.
 *
 * Per-file trailing-edge debounce. Collapses rapid bursts of filesystem
 * events (e.g. multiple writes during a single editor save) into one
 * logical event per file per burst.
 *
 * Responsibilities:
 *   - Collapse burst events on the same file into one flush
 *   - Preserve the timestamp and daemon_seq of the FIRST event in a burst
 *   - Emit the event_type of the LAST event in a burst
 *   - Bypass debounce for FILE_DELETED (emit immediately)
 *   - Drain all pending timers synchronously on flush()
 *
 * Explicitly NOT responsible for:
 *   - Publishing events
 *   - Retry logic
 *   - Queue management
 *   - Reading configuration
 *   - Any I/O
 */

import { EventType, type DevelopmentEvent } from "./event-types";

export interface DebouncerOptions {
  /** Trailing-edge debounce window in milliseconds. */
  debounceMs: number;
  /** Called once per debounced event, after the window has settled. */
  onFlush: (event: DevelopmentEvent) => void;
}

export interface Debouncer {
  /** Accept a normalised event into the debounce pipeline. */
  push(event: DevelopmentEvent): void;
  /**
   * Synchronously flush all pending timers.
   *
   * Must be called during daemon shutdown to drain in-progress bursts
   * without leaking NodeJS.Timeout handles.
   */
  flush(): void;
}

interface PendingEntry {
  timer: ReturnType<typeof setTimeout>;
  /** Snapshot of the first event in the burst (provides timestamp + daemon_seq). */
  firstEvent: DevelopmentEvent;
  /** Updated on every subsequent event in the burst. */
  lastEventType: EventType;
}

export function createDebouncer({ debounceMs, onFlush }: DebouncerOptions): Debouncer {
  const pending = new Map<string, PendingEntry>();

  function emit(entry: PendingEntry): void {
    // Merge: structural metadata from first event, final state from last event.
    onFlush({ ...entry.firstEvent, event_type: entry.lastEventType });
  }

  function armTimer(key: string, entry: PendingEntry): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      pending.delete(key);
      emit(entry);
    }, debounceMs);
  }

  return {
    push(event: DevelopmentEvent): void {
      const key = event.file_path ?? "";
      const existing = pending.get(key);
      if (event.event_type === EventType.FILE_DELETED) {
        if (existing) {
          clearTimeout(existing.timer);
          pending.delete(key);
        }
        onFlush(event);
        return;
      }

      // Key by file_path. Observation events have undefined file_path;
      // they bypass the debouncer in the gate, so this branch is safe.
      if (existing) {
        // Burst: reset the window, record the latest event_type.
        clearTimeout(existing.timer);
        existing.lastEventType = event.event_type;
        existing.timer = armTimer(key, existing);
      } else {
        // First event for this file in this burst.
        const entry: PendingEntry = {
          firstEvent: event,
          lastEventType: event.event_type,
          timer: undefined!, // assigned on the very next line
        };
        entry.timer = armTimer(key, entry);
        pending.set(key, entry);
      }
    },

    flush(): void {
      for (const [, entry] of pending) {
        clearTimeout(entry.timer);
        emit(entry);
      }
      pending.clear();
    },
  };
}
