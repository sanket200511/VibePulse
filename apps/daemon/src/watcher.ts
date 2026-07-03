/**
 * File system watcher.
 *
 * Wraps chokidar with project-specific ignore patterns. Classifies each
 * raw fs event into a DevelopmentEvent and hands it to a Publisher — the
 * watcher never talks to the API (or any transport) directly.
 */

import chokidar, { type FSWatcher } from "chokidar";
import { logger } from "./logger";
import { buildEvent } from "./event-builder";
import { EventType } from "./event-types";
import type { Publisher } from "./publisher/publisher";

const IGNORED_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.turbo/,
  /__pycache__/,
  /\.venv/,
  /venv/,
  /\.uv/,
  /\.next/,
  /\.nuxt/,
];

export interface Watcher {
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export interface CreateWatcherOptions {
  root: string;
  publisher: Publisher;
  sessionId: string;
}

export function createWatcher({ root, publisher, sessionId }: CreateWatcherOptions): Watcher {
  let fsWatcher: FSWatcher | null = null;

  const publishFor = (eventType: EventType, filePath: string): void => {
    const event = buildEvent({ eventType, filePath, projectRoot: root, sessionId });
    void publisher.publish(event).catch((error: unknown) => {
      logger.error(`Unexpected publisher failure for ${filePath}:`, error);
    });
  };

  return {
    async start(): Promise<void> {
      return new Promise((resolve) => {
        fsWatcher = chokidar.watch(root, {
          ignored: IGNORED_PATTERNS,
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
            publishFor(EventType.FILE_CREATED, filePath);
          })
          .on("change", (filePath) => {
            logger.debug(`FILE_MODIFIED ${filePath}`);
            publishFor(EventType.FILE_MODIFIED, filePath);
          })
          .on("unlink", (filePath) => {
            logger.debug(`FILE_DELETED  ${filePath}`);
            publishFor(EventType.FILE_DELETED, filePath);
          })
          .on("error", (error) => {
            logger.error("Watcher error:", error);
          })
          .on("ready", () => {
            logger.debug("Initial scan complete.");
            resolve();
          });
      });
    },

    async stop(): Promise<void> {
      if (fsWatcher) {
        await fsWatcher.close();
        fsWatcher = null;
        logger.info("   Watcher closed.");
      }
    },
  };
}
