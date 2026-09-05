/**
 * DepRadar Daemon – Composition root.
 *
 * Pipeline:
 *   WatchManager (Watcher → Normaliser) → Gate → Debouncer → Queue → Publisher → API
 *
 * Control:
 *   HealthServer owns the health check and control endpoints:
 *     GET  /health
 *     POST /watch (runtime dynamic project switch)
 *     POST /control/observe/start|stop
 */

import { parsePort, getEnv } from "@depradar/config";
import { loadDaemonEnv, watchEnvFile } from "./env-loader";
import { loadConfig } from "./config";
import { createObservationGate } from "./observation-gate";
import { createDebouncer } from "./debouncer";
import { createEventQueue } from "./event-queue";
import { createHttpPublisher } from "./publisher/http-publisher";
import { createWatchManager } from "./watch-manager";
import { createHealthServer } from "./health-server";
import { logger } from "./logger";
import type { DevelopmentEvent } from "./event-types";
import { createShutdownHandler } from "./shutdown";

// Load .env and CLI flags before reading process.env
loadDaemonEnv();

const PORT = parsePort("VIBEPULSE_DAEMON_PORT", parsePort("DAEMON_PORT", 5185));

async function main(): Promise<void> {
  // ── Configuration ─────────────────────────────────────────────────────────
  const config = loadConfig();
  const rawWatchRoot = process.env["WATCH_ROOT"] ?? process.cwd();
  const apiUrl = getEnv("VIBEPULSE_API_URL") ?? getEnv("API_URL") ?? "http://localhost:5184";

  logger.info("=========================================");
  logger.info("           DepRadar Daemon              ");
  logger.info("=========================================");
  logger.info(`Initial Target : ${rawWatchRoot}`);
  logger.info(`API            : ${apiUrl}`);
  logger.info(`Daemon port    : ${PORT}`);

  // ── Pipeline primitives ───────────────────────────────────────────────────
  const gate = createObservationGate();
  gate.open();

  const publisher = createHttpPublisher(apiUrl, config);

  const queue = createEventQueue({
    maxSize: config.queueMaxSize,
    onOverflow: (rejected: DevelopmentEvent) => {
      logger.warn(
        "Queue overflow — incoming event rejected (start of observation window preserved)",
        {
          dropped_event_type: rejected.event_type,
          dropped_file_path: rejected.file_path ?? null,
          dropped_daemon_seq: rejected.daemon_seq,
          queue_capacity: config.queueMaxSize,
        },
      );
    },
  });

  let isDraining = false;
  async function drainQueue(): Promise<void> {
    if (isDraining) return;
    isDraining = true;
    try {
      while (!queue.isEmpty()) {
        const event = queue.dequeue();
        if (!event) break;
        await publisher.publish(event);
      }
    } finally {
      isDraining = false;
    }
  }

  const debouncer = createDebouncer({
    debounceMs: config.debounceMs,
    onFlush: (event: DevelopmentEvent): void => {
      queue.enqueue(event);
      void drainQueue().catch((err: unknown) => {
        logger.error("Unexpected queue drain error:", err);
      });
    },
  });

  // ── WatchManager & Control Server ─────────────────────────────────────────
  const watchManager = createWatchManager({
    apiUrl,
    gate,
    debouncer,
  });

  const healthServer = createHealthServer(PORT, watchManager);
  healthServer.listen();

  // Start observation on initial project with retry
  try {
    await watchManager.start(rawWatchRoot);
  } catch (err: unknown) {
    logger.error(`Failed to start observation on initial target "${rawWatchRoot}":`, err);
  }

  // ── Watch .env file for live zero-restart project switching ─────────────────
  const unwatchEnv = watchEnvFile((newRoot) => {
    logger.info(`[EnvWatcher] Detected live WATCH_ROOT change: ${newRoot}`);
    void watchManager.switch(newRoot).catch((err: unknown) => {
      logger.error(`[EnvWatcher] Failed to switch to "${newRoot}":`, err);
    });
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = createShutdownHandler({
    gate,
    watcher: {
      start: async () => {},
      stop: async () => {
        unwatchEnv();
        await watchManager.stop();
      },
    },
    publisher,
    healthServer,
    drainQueue,
    sessionId: watchManager.getSessionId() ?? "shutdown-session",
    watchRoot: watchManager.getCanonicalRoot() ?? rawWatchRoot,
    exitProcess: (code) => process.exit(code),
  });

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason: unknown) => {
    logger.error(
      "[Daemon Resilient Supervisor] Unhandled rejection intercepted (process kept alive):",
      reason,
    );
  });
  process.on("uncaughtException", (error: Error) => {
    logger.error(
      "[Daemon Resilient Supervisor] Uncaught exception intercepted (process kept alive):",
      error,
    );
  });
}

main().catch((error: unknown) => {
  logger.error("Fatal error during daemon startup:", error);
  process.exit(1);
});
