import type { ObservationGate } from "./observation-gate";
import type { Watcher } from "./watcher";
import type { Publisher } from "./publisher/publisher";
import type { HealthServer } from "./health-server";
import { EventType, type DevelopmentEvent } from "./event-types";
import { logger } from "./logger";

export interface ShutdownOptions {
  gate: ObservationGate;
  watcher: Watcher;
  publisher: Publisher;
  healthServer: HealthServer;
  drainQueue: () => Promise<void>;
  sessionId: string;
  watchRoot: string;
  exitProcess: (code: number) => void;
}

export function createShutdownHandler({
  gate,
  watcher,
  publisher,
  healthServer,
  drainQueue,
  sessionId,
  watchRoot,
  exitProcess,
}: ShutdownOptions) {
  let isShuttingDown = false;

  return async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      logger.info(`   Ignoring duplicate shutdown signal: ${signal}`);
      return;
    }
    isShuttingDown = true;
    logger.info(`\n🛑  Received ${signal}. Shutting down gracefully…`);

    const wasOpen = gate.isOpen();
    gate.close();

    await watcher.stop(); // flushes debouncer before closing Chokidar

    // Drain any events that were debounced during watcher.stop()
    await drainQueue().catch((err: unknown) => {
      logger.error("Error draining queue during shutdown:", err);
    });

    if (wasOpen) {
      const terminalEvent: DevelopmentEvent = {
        schema_version: 1,
        event_type: EventType.OBSERVATION_STOPPED,
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        project_root: watchRoot,
        file_path: undefined,
        file_name: undefined,
        metadata: {},
        daemon_seq: 0,
      };

      // Use publishCritical to ensure elevated retries and logging
      try {
        await publisher.publishCritical(terminalEvent);
        logger.info("   Terminal observation boundary successfully emitted.");
      } catch (err) {
        logger.error("   Failed to emit terminal observation boundary:", err);
      }
    }

    healthServer.close();
    logger.info("   Done. Goodbye.");
    exitProcess(0);
  };
}
