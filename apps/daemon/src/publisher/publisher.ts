/**
 * Publisher abstraction.
 *
 * The watcher must never call HTTP (or any transport) directly — it
 * publishes through this interface. This is what lets Sprint 2 swap in a
 * Redis Streams publisher (see ADR 0003) without touching watcher.ts.
 *
 * Two priority levels exist (ADR-0012 §7):
 *   - publish()         NORMAL  — file events, drawn from the queue
 *   - publishCritical() CRITICAL — observation boundary events, never queued
 */

import type { DevelopmentEvent } from "../event-types";

export interface Publisher {
  /** NORMAL priority: publish a file event with standard retry limits. */
  publish: (event: DevelopmentEvent) => Promise<void>;
  /**
   * CRITICAL priority: publish an observation boundary event
   * (OBSERVATION_STARTED / OBSERVATION_STOPPED) with elevated retry limits.
   * CRITICAL events are never queued and always sent immediately.
   */
  publishCritical: (event: DevelopmentEvent) => Promise<void>;
}
