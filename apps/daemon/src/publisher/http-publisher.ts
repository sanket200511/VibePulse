/**
 * HTTP implementation of Publisher.
 *
 * POSTs events to the API with priority-class retry behaviour (ADR-0012 §7).
 *
 * NORMAL  (publish)         — file events; retries up to retryMaxNormal.
 * CRITICAL (publishCritical) — observation boundary events; retries up to
 *                             retryMaxCritical, logs ERROR on exhaustion.
 *
 * Retry counts and backoff are fully configuration-driven — no hardcoded
 * constants. All config arrives via PublisherConfig at construction time.
 *
 * Responsibilities:
 *   - HTTP delivery with exponential backoff
 *   - Priority-class retry limits
 *
 * Explicitly NOT responsible for:
 *   - Debouncing
 *   - Normalisation
 *   - Queue management
 *   - Filesystem access
 *   - Event classification
 */

import { logger } from "../logger";
import type { DevelopmentEvent } from "../event-types";
import type { Publisher } from "./publisher";

export interface PublisherConfig {
  /** Max retry attempts for NORMAL-priority events (file events). */
  retryMaxNormal: number;
  /** Max retry attempts for CRITICAL-priority events (observation boundaries). */
  retryMaxCritical: number;
  /** Base delay in ms for exponential backoff: delay = base * 2^(attempt-1). */
  retryBackoffBaseMs: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attempt(
  eventsEndpoint: string,
  event: DevelopmentEvent,
  maxAttempts: number,
  backoffBaseMs: number,
  priority: "NORMAL" | "CRITICAL",
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(eventsEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });

      if (response.ok) {
        return;
      }

      if (response.status >= 400 && response.status < 500) {
        // 4xx: permanent client error — do not retry.
        logger.error(
          `Event rejected by API (${response.status}): ${event.event_type} ${event.file_path ?? ""}`,
        );
        return;
      }

      throw new Error(`API responded with ${response.status}`);
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts;
      if (isLastAttempt) {
        if (priority === "CRITICAL") {
          logger.error(
            `[CRITICAL] Failed to publish observation boundary event after ${maxAttempts} attempts: ` +
              `${event.event_type}. Observation window boundary may be missing in the event stream.`,
            error,
          );
        } else {
          logger.error(
            `Failed to publish event after ${maxAttempts} attempts: ${event.event_type} ${event.file_path ?? ""}`,
            error,
          );
        }
        return;
      }
      await sleep(backoffBaseMs * 2 ** (attempt - 1));
    }
  }
}

export function createHttpPublisher(apiUrl: string, config: PublisherConfig): Publisher {
  const eventsEndpoint = new URL("/events", apiUrl).toString();

  return {
    async publish(event: DevelopmentEvent): Promise<void> {
      await attempt(
        eventsEndpoint,
        event,
        config.retryMaxNormal,
        config.retryBackoffBaseMs,
        "NORMAL",
      );
    },

    async publishCritical(event: DevelopmentEvent): Promise<void> {
      await attempt(
        eventsEndpoint,
        event,
        config.retryMaxCritical,
        config.retryBackoffBaseMs,
        "CRITICAL",
      );
    },
  };
}
