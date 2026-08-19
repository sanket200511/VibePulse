import { randomUUID } from "crypto";
import { logger } from "./logger";
import { validateAndResolveWatchRoot } from "./path-validator";
import { ensureProjectWithRetry } from "./project-registrar";
import { createNormaliser, type Normaliser } from "./normaliser";
import { createWatcher, type Watcher } from "./watcher";
import type { ObservationGate } from "./observation-gate";
import type { Debouncer } from "./debouncer";

export interface WatchStatus {
  observing: boolean;
  project_id: string | null;
  project_name: string | null;
  root: string | null;
  canonical_root: string | null;
  session_id: string | null;
}

export interface WatchManagerOptions {
  apiUrl: string;
  gate: ObservationGate;
  debouncer: Debouncer;
}

export interface WatchManager {
  start(targetPath: string): Promise<WatchStatus>;
  switch(targetPath: string): Promise<WatchStatus>;
  stop(): Promise<void>;
  getStatus(): WatchStatus;
  getGate(): ObservationGate;
  getSessionId(): string | null;
  getCanonicalRoot(): string | null;
  getWatcher(): Watcher | null;
}

/**
 * WatchManager owns the lifecycle of filesystem observation and runtime project switching.
 */
export function createWatchManager({ apiUrl, gate, debouncer }: WatchManagerOptions): WatchManager {
  let currentRoot: string | null = null;
  let currentCanonicalRoot: string | null = null;
  let currentProjectId: string | null = null;
  let currentProjectName: string | null = null;
  let currentSessionId: string | null = null;
  let currentWatcher: Watcher | null = null;
  let currentNormaliser: Normaliser | null = null;
  let activeGeneration = 0;

  function getStatus(): WatchStatus {
    return {
      observing: gate.isOpen() && currentWatcher !== null,
      project_id: currentProjectId,
      project_name: currentProjectName,
      root: currentRoot,
      canonical_root: currentCanonicalRoot,
      session_id: currentSessionId,
    };
  }

  async function switchProject(targetPath: string): Promise<WatchStatus> {
    const validation = validateAndResolveWatchRoot(targetPath);
    if (!validation.valid) {
      throw new Error(`Invalid watch path: ${validation.errorMessage}`);
    }

    const newCanonicalRoot = validation.resolvedPath;

    // Idempotency: if already watching the exact canonical root, no-op
    if (currentCanonicalRoot === newCanonicalRoot && currentWatcher !== null) {
      logger.info(`[WatchManager] Already observing canonical root: ${newCanonicalRoot}`);
      return getStatus();
    }

    logger.info("=========================================");
    logger.info("       [WatchManager] Project Switch     ");
    logger.info("=========================================");
    logger.info(`Target Root    : ${targetPath}`);
    logger.info(`Canonical Root : ${newCanonicalRoot}`);

    // Invalidate previous generation to ignore old async callbacks
    activeGeneration++;
    const thisGeneration = activeGeneration;

    // Stop existing watcher if running
    if (currentWatcher) {
      logger.info(`[WatchManager] Stopping active watcher for: ${currentCanonicalRoot}`);
      try {
        await currentWatcher.stop();
      } catch (err) {
        logger.warn("[WatchManager] Warning stopping previous watcher:", err);
      }
      currentWatcher = null;
    }

    // Allocate fresh session ID for new project observation window
    const newSessionId = randomUUID();

    // Register project with API (resilient backoff)
    const project = await ensureProjectWithRetry(apiUrl, newCanonicalRoot);

    // If another switch occurred while awaiting API, abort this one
    if (thisGeneration !== activeGeneration) {
      logger.info("[WatchManager] Superseded by concurrent project switch. Discarding.");
      return getStatus();
    }

    // Construct new normaliser bound to canonical root & session ID
    currentNormaliser = createNormaliser({
      projectRoot: newCanonicalRoot,
      sessionId: newSessionId,
    });

    // Create and start new watcher
    currentWatcher = createWatcher({
      root: newCanonicalRoot,
      normaliser: currentNormaliser,
      gate,
      debouncer,
    });

    await currentWatcher.start();

    // Update state
    currentRoot = targetPath;
    currentCanonicalRoot = newCanonicalRoot;
    currentProjectId = project.id;
    currentProjectName = project.display_name;
    currentSessionId = newSessionId;

    logger.info(`[WatchManager] Now observing: ${currentProjectName}`);
    logger.info(`   Path   : ${currentCanonicalRoot}`);
    logger.info(`   ID     : ${currentProjectId}`);
    logger.info(`   Session: ${currentSessionId}\n`);

    return getStatus();
  }

  return {
    async start(targetPath: string): Promise<WatchStatus> {
      return await switchProject(targetPath);
    },

    async switch(targetPath: string): Promise<WatchStatus> {
      return await switchProject(targetPath);
    },

    async stop(): Promise<void> {
      activeGeneration++;
      if (currentWatcher) {
        await currentWatcher.stop();
        currentWatcher = null;
      }
      currentRoot = null;
      currentCanonicalRoot = null;
      currentProjectId = null;
      currentProjectName = null;
      currentSessionId = null;
      currentNormaliser = null;
    },

    getStatus,
    getGate(): ObservationGate {
      return gate;
    },
    getSessionId(): string | null {
      return currentSessionId;
    },
    getCanonicalRoot(): string | null {
      return currentCanonicalRoot;
    },
    getWatcher(): Watcher | null {
      return currentWatcher;
    },
  };
}
