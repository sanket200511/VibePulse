/**
 * Observation Gate.
 *
 * A simple boolean gate that controls whether events are allowed to
 * proceed through the observation pipeline.
 *
 * Responsibilities:
 *   - Track whether observation is currently active (open/closed)
 *   - Expose open(), close(), and isOpen() operations
 *
 * Explicitly NOT responsible for:
 *   - Timers or timeouts
 *   - Watcher lifecycle
 *   - Networking
 *   - Logging
 *   - Persistence
 */

export interface ObservationGate {
  /** Returns true when observation is active and events should be passed through. */
  isOpen(): boolean;
  /** Opens the gate. Idempotent — calling open() when already open is safe. */
  open(): void;
  /** Closes the gate. Idempotent — calling close() when already closed is safe. */
  close(): void;
}

/**
 * Creates an ObservationGate that starts closed.
 *
 * The gate is closed by default so that the daemon never publishes events
 * before an observation window has been explicitly started.
 */
export function createObservationGate(): ObservationGate {
  let observing = false;

  return {
    isOpen(): boolean {
      return observing;
    },
    open(): void {
      observing = true;
    },
    close(): void {
      observing = false;
    },
  };
}
