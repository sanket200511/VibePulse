import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import chokidar, { type FSWatcher } from "chokidar";

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  eventType: string;
  path: string;
  relativePath: string;
  size?: number;
}

export interface EngineStatus {
  observing: boolean;
  projectRoot: string | null;
  projectName: string | null;
  sessionId: string | null;
  eventsCaptured: number;
  eventsPublished: number;
}

export const DEFAULT_IGNORED: readonly RegExp[] = [
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
  /\.DS_Store/,
  /Thumbs\.db/,
  /\.idea/,
  /\.mypy_cache/,
  /\.pytest_cache/,
  /\.ruff_cache/,
  /\.(swp|swo)$/,
  /~$/,
  /\.log$/,
  /\.lock$/,
  /\.env(\.|$)/,
  /\.ssh/,
  /\.gnupg/,
];

export class DesktopObservationEngine {
  private watcher: FSWatcher | null = null;
  private currentRoot: string | null = null;
  private currentSessionId: string | null = null;
  private currentApiUrl: string = "https://vibepulse-api.onrender.com";
  private currentToken: string | undefined = undefined;
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingBatch: Map<string, { eventType: string; timestamp: string }> = new Map();
  private debounceDelayMs: number = 300;
  private eventsCapturedCount: number = 0;
  private eventsPublishedCount: number = 0;
  private onEventCallback?: (event: TelemetryEvent) => void;
  private onStatusCallback?: (status: EngineStatus) => void;

  constructor(callbacks?: {
    onEvent?: (event: TelemetryEvent) => void;
    onStatus?: (status: EngineStatus) => void;
  }) {
    this.onEventCallback = callbacks?.onEvent;
    this.onStatusCallback = callbacks?.onStatus;
  }

  public getStatus(): EngineStatus {
    return {
      observing: this.watcher !== null,
      projectRoot: this.currentRoot,
      projectName: this.currentRoot ? path.basename(this.currentRoot) : null,
      sessionId: this.currentSessionId,
      eventsCaptured: this.eventsCapturedCount,
      eventsPublished: this.eventsPublishedCount,
    };
  }

  public async start(options: {
    projectRoot: string;
    apiUrl: string;
    token?: string;
    debounceMs?: number;
  }): Promise<EngineStatus> {
    const { projectRoot, apiUrl, token, debounceMs } = options;

    // If already watching this path, no-op
    if (this.watcher && this.currentRoot === projectRoot) {
      return this.getStatus();
    }

    // Stop current watcher if running
    await this.stop();

    if (!fs.existsSync(projectRoot)) {
      throw new Error(`Directory does not exist: ${projectRoot}`);
    }

    this.currentRoot = path.resolve(projectRoot);
    this.currentApiUrl = apiUrl.replace(/\/+$/, "");
    this.currentToken = token;
    this.debounceDelayMs = debounceMs ?? 300;
    this.currentSessionId = randomUUID();

    // Register project and send initial OBSERVATION_STARTED
    await this.notifyStart();

    // Setup Chokidar watcher
    this.watcher = chokidar.watch(this.currentRoot, {
      ignored: [...DEFAULT_IGNORED],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    this.watcher
      .on("add", (filePath: string) => this.handleRawEvent("FILE_CREATED", filePath))
      .on("change", (filePath: string) => this.handleRawEvent("FILE_MODIFIED", filePath))
      .on("unlink", (filePath: string) => this.handleRawEvent("FILE_DELETED", filePath))
      .on("addDir", (dirPath: string) => this.handleRawEvent("DIR_CREATED", dirPath))
      .on("unlinkDir", (dirPath: string) => this.handleRawEvent("DIR_DELETED", dirPath))
      .on("error", (err: unknown) => console.error("[DesktopWatcher] Error:", err));

    const status = this.getStatus();
    this.onStatusCallback?.(status);
    return status;
  }

  public async stop(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.flushBatch();

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      await this.notifyStop();
    }

    const status = this.getStatus();
    this.onStatusCallback?.(status);
  }

  private handleRawEvent(eventType: string, fullPath: string): void {
    if (!this.currentRoot) return;

    this.eventsCapturedCount++;
    const relPath = path.relative(this.currentRoot, fullPath).replace(/\\/g, "/");
    const timestamp = new Date().toISOString();

    let size: number | undefined = undefined;
    try {
      if (eventType !== "FILE_DELETED" && eventType !== "DIR_DELETED") {
        const stats = fs.statSync(fullPath);
        size = stats.size;
      }
    } catch {
      // ignore
    }

    const event: TelemetryEvent = {
      id: randomUUID(),
      timestamp,
      eventType,
      path: fullPath,
      relativePath: relPath,
      size,
    };

    // Forward immediately to Desktop UI
    this.onEventCallback?.(event);

    // Queue for debounced cloud publishing
    this.pendingBatch.set(relPath, { eventType, timestamp });

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.flushBatch();
    }, this.debounceDelayMs);
  }

  private flushBatch(): void {
    if (this.pendingBatch.size === 0 || !this.currentRoot || !this.currentSessionId) return;

    const items = Array.from(this.pendingBatch.entries());
    this.pendingBatch.clear();

    for (const [relPath, info] of items) {
      void this.publishToApi(info.eventType, relPath, info.timestamp);
    }
  }

  private async publishToApi(eventType: string, relPath: string, timestamp: string): Promise<void> {
    if (!this.currentRoot || !this.currentSessionId) return;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.currentToken) {
      headers["Authorization"] = `Bearer ${this.currentToken}`;
      headers["X-Daemon-Token"] = this.currentToken;
    }

    try {
      await fetch(`${this.currentApiUrl}/events`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          schema_version: 1,
          event_type: eventType,
          timestamp,
          session_id: this.currentSessionId,
          project_root: this.currentRoot,
          file_path: relPath,
          daemon_seq: ++this.eventsPublishedCount,
        }),
      });
    } catch (err) {
      console.warn("[DesktopEngine] Could not publish event to cloud:", err);
    }
  }

  private async notifyStart(): Promise<void> {
    if (!this.currentRoot || !this.currentSessionId) return;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.currentToken) {
      headers["Authorization"] = `Bearer ${this.currentToken}`;
      headers["X-Daemon-Token"] = this.currentToken;
    }

    try {
      // 1. Ensure project exists
      await fetch(`${this.currentApiUrl}/api/projects`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: path.basename(this.currentRoot),
          root_path: this.currentRoot,
        }),
      }).catch(() => {});

      // 2. Dispatch OBSERVATION_STARTED
      await fetch(`${this.currentApiUrl}/events`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          schema_version: 1,
          event_type: "OBSERVATION_STARTED",
          timestamp: new Date().toISOString(),
          session_id: this.currentSessionId,
          project_root: this.currentRoot,
          metadata: { reason: "desktop_app_started" },
          daemon_seq: 1,
        }),
      });
    } catch {
      // best-effort
    }
  }

  private async notifyStop(): Promise<void> {
    if (!this.currentRoot || !this.currentSessionId) return;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.currentToken) {
      headers["Authorization"] = `Bearer ${this.currentToken}`;
      headers["X-Daemon-Token"] = this.currentToken;
    }

    try {
      await fetch(`${this.currentApiUrl}/events`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          schema_version: 1,
          event_type: "OBSERVATION_STOPPED",
          timestamp: new Date().toISOString(),
          session_id: this.currentSessionId,
          project_root: this.currentRoot,
          metadata: { reason: "desktop_app_stopped" },
          daemon_seq: 999999,
        }),
      });
    } catch {
      // best-effort
    }
  }
}
