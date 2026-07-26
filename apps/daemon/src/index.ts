/**
 * VibePulse Daemon – Composition root.
 *
 * This file's only job is dependency wiring. It constructs each component
 * of the observation pipeline in order and hands each one exactly the
 * collaborators it needs. No business logic lives here.
 *
 * Pipeline:
 *   Watcher → Normaliser → Gate → Debouncer → Queue → Publisher → API
 *
 * Control:
 *   HealthServer owns the gate control endpoints (POST /control/observe/start|stop).
 */

import { randomUUID } from "crypto";
import { parsePort, getEnv } from "@vibepulse/config";
import { loadConfig } from "./config";
import { createNormaliser } from "./normaliser";
import { createObservationGate } from "./observation-gate";
import { createDebouncer } from "./debouncer";
import { createEventQueue } from "./event-queue";
import { createHttpPublisher } from "./publisher/http-publisher";
import { createWatcher } from "./watcher";
import { createHealthServer } from "./health-server";
import { logger } from "./logger";
import type { DevelopmentEvent } from "./event-types";
import { createShutdownHandler } from "./shutdown";

const PORT = parsePort("DAEMON_PORT", 9000);

async function main(): Promise<void> {
  logger.info("⚡ VibePulse Daemon starting…");
  logger.info(`   Version  : 0.1.0`);
  logger.info(`   Node     : ${process.version}`);
  logger.info(`   PID      : ${process.pid}`);

  // ── Configuration ─────────────────────────────────────────────────────────
  const config = loadConfig();
  const watchRoot = process.env["WATCH_ROOT"] ?? process.cwd();
  const apiUrl = getEnv("API_URL") ?? "http://localhost:8000";
  const sessionId = randomUUID();

  // ── Pipeline construction (in pipeline order) ─────────────────────────────

  const normaliser = createNormaliser({ projectRoot: watchRoot, sessionId });

  const gate = createObservationGate();

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

  // drainQueue() is fire-and-forget: called each time a debounced event is
  // enqueued. If the API is unavailable, the publisher retries internally;
  // after exhausting retries the event is logged and dropped (not re-queued).
  async function drainQueue(): Promise<void> {
    while (!queue.isEmpty()) {
      const event = queue.dequeue();
      if (!event) break;
      await publisher.publish(event);
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

  const watcher = createWatcher({ root: watchRoot, normaliser, gate, debouncer });

  // ── Health / control server ────────────────────────────────────────────────
  const healthServer = createHealthServer(PORT, gate);
  healthServer.listen();

  // ── Start watcher ─────────────────────────────────────────────────────────
  await watcher.start();

  logger.info(`✅  VibePulse Daemon running on port ${PORT}`);
  logger.info(`   Watching : ${watchRoot}`);
  logger.info(`   API      : ${apiUrl}`);
  logger.info(`   Session  : ${sessionId}`);

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = createShutdownHandler({
    gate,
    watcher,
    publisher,
    healthServer,
    drainQueue,
    sessionId,
    watchRoot,
    exitProcess: (code) => process.exit(code),
  });

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  logger.error("Fatal error during daemon startup:", error);
  process.exit(1);
});
