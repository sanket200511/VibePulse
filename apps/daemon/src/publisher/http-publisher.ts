/**
 * HTTP implementation of Publisher.
 *
 * POSTs events to the API. Retries transient failures (API unavailable,
 * network blips) with exponential backoff; after exhausting retries it
 * logs and drops the event rather than crashing the daemon — a dropped
 * observability event is not worth taking the watcher down for.
 */

import { logger } from "../logger";
import type { DevelopmentEvent } from "../event-types";
import type { Publisher } from "./publisher";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createHttpPublisher(apiUrl: string): Publisher {
  const eventsEndpoint = new URL("/events", apiUrl).toString();

  return {
    async publish(event: DevelopmentEvent): Promise<void> {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
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
            logger.error(
              `Event rejected by API (${response.status}): ${event.event_type} ${event.file_path}`,
            );
            return;
          }

          throw new Error(`API responded with ${response.status}`);
        } catch (error) {
          const isLastAttempt = attempt === MAX_ATTEMPTS;
          if (isLastAttempt) {
            logger.error(
              `Failed to publish event after ${MAX_ATTEMPTS} attempts: ${event.event_type} ${event.file_path}`,
              error,
            );
            return;
          }
          await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
        }
      }
    },
  };
}
