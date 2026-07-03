/**
 * Publisher abstraction.
 *
 * The watcher must never call HTTP (or any transport) directly — it
 * publishes through this interface. This is what lets Sprint 2 swap in a
 * Redis Streams publisher (see ADR 0003) without touching watcher.ts.
 */

import type { DevelopmentEvent } from "../event-types";

export interface Publisher {
  publish: (event: DevelopmentEvent) => Promise<void>;
}
