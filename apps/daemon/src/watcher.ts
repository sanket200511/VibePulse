/**
 * File system watcher.
 *
 * Wraps chokidar with project-specific ignore patterns.
 * Sprint 0: scaffolded but events are not yet processed.
 * Sprint 1: events will be classified and forwarded to the API.
 */

import chokidar, { type FSWatcher } from "chokidar";
import { logger } from "./logger";

const IGNORED_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /\.turbo/,
  /__pycache__/,
  /\.venv/,
  /\.uv/,
  /\.next/,
  /\.nuxt/,
];

export interface Watcher {
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export function createWatcher(root: string): Watcher {
  let fsWatcher: FSWatcher | null = null;

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
            logger.debug(`FILE_ADDED    ${filePath}`);
            // TODO(sprint-1): emit FileAddedEvent to API
          })
          .on("change", (filePath) => {
            logger.debug(`FILE_CHANGED  ${filePath}`);
            // TODO(sprint-1): emit FileChangedEvent to API
          })
          .on("unlink", (filePath) => {
            logger.debug(`FILE_REMOVED  ${filePath}`);
            // TODO(sprint-1): emit FileRemovedEvent to API
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
