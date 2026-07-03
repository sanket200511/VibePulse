/**
 * VibePulse Daemon – Entry point
 *
 * The daemon is a long-running Node.js process that:
 *  1. Watches the developer's project directory for file system changes
 *  2. Classifies and enriches change events
 *  3. Streams events to the VibePulse API
 *
 * Sprint 0: Process boots, logs health, and exits cleanly on signals.
 * Sprint 1: File watching and event emission will be wired up.
 */

import { parsePort } from "@vibepulse/config";
import { createWatcher } from "./watcher";
import { createHealthServer } from "./health-server";
import { logger } from "./logger";

const PORT = parsePort("DAEMON_PORT", 9000);

async function main(): Promise<void> {
  logger.info("⚡ VibePulse Daemon starting…");
  logger.info(`   Version  : 0.1.0`);
  logger.info(`   Node     : ${process.version}`);
  logger.info(`   PID      : ${process.pid}`);

  // ── Health server (lightweight HTTP) ─────────────────────────────────────
  const healthServer = createHealthServer(PORT);
  healthServer.listen();

  // ── File watcher ──────────────────────────────────────────────────────────
  const watchRoot = process.env["WATCH_ROOT"] ?? process.cwd();
  const watcher = createWatcher(watchRoot);
  await watcher.start();

  logger.info(`✅  VibePulse Daemon running on port ${PORT}`);
  logger.info(`   Watching : ${watchRoot}`);

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`\n🛑  Received ${signal}. Shutting down gracefully…`);
    await watcher.stop();
    healthServer.close();
    logger.info("   Done. Goodbye.");
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  logger.error("Fatal error during daemon startup:", error);
  process.exit(1);
});
