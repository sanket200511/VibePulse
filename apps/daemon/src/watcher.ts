/**
 * Filesystem watcher.
 *
 * Wraps Chokidar with the consolidated ignore patterns and forwards raw
 * OS filesystem events into the observation pipeline.
 *
 * Responsibilities:
 *   - Start and stop the Chokidar watcher (always-on, per ADR-0012 §1)
 *   - Apply the ignore filter at the OS layer (IGNORED_PATTERNS)
 *   - Forward each event to the Normaliser, then the Observation Gate,
 *     then the Debouncer
 *   - Call debouncer.flush() during stop() to drain in-progress bursts
 *
 * Explicitly NOT responsible for:
 *   - Event classification (Normaliser's job)
 *   - Gate state management (ObservationGate's job)
 *   - Burst collapsing (Debouncer's job)
 *   - Publishing (Publisher's job)
 *   - Queue management (EventQueue's job)
 */

import chokidar, { type FSWatcher } from "chokidar";
import { logger } from "./logger";
import { IGNORED_PATTERNS } from "./ignore-patterns";
import { EventType } from "./event-types";
import type { Normaliser } from "./normaliser";
import type { ObservationGate } from "./observation-gate";
import type { Debouncer } from "./debouncer";

export interface Watcher {
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export interface CreateWatcherOptions {
  root: string;
  normaliser: Normaliser;
  gate: ObservationGate;
  debouncer: Debouncer;
}

export function createWatcher({
  root,
  normaliser,
  gate,
  debouncer,
}: CreateWatcherOptions): Watcher {
  let fsWatcher: FSWatcher | null = null;

  /**
   * Process a single raw filesystem event through the pipeline stages:
   * Normaliser → Observation Gate → Debouncer.
   */
  function handleEvent(eventType: EventType, filePath: string): void {
    const event = normaliser.normalise(eventType, filePath);
    if (!event) {
      // Normaliser returned null: path is invalid or outside project root.
      logger.debug(`Watcher: dropped invalid path [${eventType}] ${filePath}`);
      return;
    }

    if (!gate.isOpen()) {
      // Observation gate is closed: silently drop the event.
      return;
    }

    debouncer.push(event);
  }

  return {
    async start(): Promise<void> {
      return new Promise((resolve) => {
        fsWatcher = chokidar.watch(root, {
          ignored: [...IGNORED_PATTERNS],
          ignoreInitial: true,
          persistent: true,
          awaitWriteFinish: {
            stabilityThreshold: 200,
            pollInterval: 100,
          },
        });

        fsWatcher
          .on("add", (filePath) => {
            logger.debug(`FILE_CREATED  ${filePath}`);
            handleEvent(EventType.FILE_CREATED, filePath);
          })
          .on("change", (filePath) => {
            logger.debug(`FILE_MODIFIED ${filePath}`);
            handleEvent(EventType.FILE_MODIFIED, filePath);
          })
          .on("unlink", (filePath) => {
            logger.debug(`FILE_DELETED  ${filePath}`);
            handleEvent(EventType.FILE_DELETED, filePath);
          })
          .on("error", (error) => {
            logger.error("Watcher error:", error);
          })
          .on("ready", () => {
            logger.debug("Initial scan complete. Watcher ready.");
            resolve();
          });
      });
    },

    async stop(): Promise<void> {
      // Drain in-progress burst timers before closing.
      debouncer.flush();

      if (fsWatcher) {
        await fsWatcher.close();
        fsWatcher = null;
        logger.info("   Watcher closed.");
      }
    },
  };
}
