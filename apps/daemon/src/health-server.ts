/**
 * Daemon HTTP control & health server.
 *
 * Serves:
 *   GET  /health                 — liveness & project observation status
 *   POST /watch                  — dynamic live project switch
 *   POST /control/watch          — dynamic live project switch (alias)
 *   POST /control/observe/start  — open the observation gate
 *   POST /control/observe/stop   — close the observation gate
 */

import http from "http";
import { logger } from "./logger";
import type { ObservationGate } from "./observation-gate";
import type { WatchManager, WatchStatus } from "./watch-manager";

const DAEMON_VERSION = "0.1.0";

export interface HealthServer {
  listen: () => void;
  close: () => void;
}

function jsonResponse(res: http.ServerResponse, status: number, body: object): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer | string) => {
      body += chunk;
      if (body.length > 65536) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        if (!body.trim()) {
          resolve({});
          return;
        }
        resolve(JSON.parse(body) as Record<string, unknown>);
      } catch {
        reject(new Error("Malformed JSON payload"));
      }
    });
    req.on("error", (err) => reject(err));
  });
}

export function createHealthServer(
  port: number,
  target: ObservationGate | WatchManager,
): HealthServer {
  const isWatchManager = "getStatus" in target && typeof target.getStatus === "function";
  const watchManager = isWatchManager ? (target as WatchManager) : null;
  const gate: ObservationGate = isWatchManager
    ? (target as WatchManager).getGate()
    : (target as ObservationGate);

  async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      // GET /health — liveness probe & status
      if (req.url === "/health" && req.method === "GET") {
        const watchStatus: Partial<WatchStatus> = watchManager ? watchManager.getStatus() : {};

        jsonResponse(res, 200, {
          status: "healthy",
          version: DAEMON_VERSION,
          pid: process.pid,
          uptime: process.uptime(),
          observing: gate.isOpen(),
          ...watchStatus,
        });
        return;
      }

      // POST /watch or POST /control/watch — dynamic runtime project switch
      if ((req.url === "/watch" || req.url === "/control/watch") && req.method === "POST") {
        if (!watchManager) {
          jsonResponse(res, 500, {
            error: "WatchManager not configured on health server",
          });
          return;
        }

        const body = await readJsonBody(req);
        const targetPath =
          (body["root"] as string) || (body["watch_root"] as string) || (body["path"] as string);

        if (!targetPath || typeof targetPath !== "string") {
          jsonResponse(res, 400, {
            error: 'Missing required "root" path in request body',
          });
          return;
        }

        try {
          const status = await watchManager.switch(targetPath);
          jsonResponse(res, 200, {
            status: "observing",
            ...status,
          });
        } catch (switchErr: unknown) {
          logger.error("[HealthServer] Project switch failed:", switchErr);
          jsonResponse(res, 400, {
            error: switchErr instanceof Error ? switchErr.message : String(switchErr),
          });
        }
        return;
      }

      // POST /control/observe/start — open the gate
      if (req.url === "/control/observe/start" && req.method === "POST") {
        const alreadyActive = gate.isOpen();
        gate.open();
        logger.info("Observation gate opened via control endpoint.");
        jsonResponse(res, 200, { observing: true, already_active: alreadyActive });
        return;
      }

      // POST /control/observe/stop — close the gate
      if (req.url === "/control/observe/stop" && req.method === "POST") {
        const alreadyActive = !gate.isOpen();
        gate.close();
        logger.info("Observation gate closed via control endpoint.");
        jsonResponse(res, 200, { observing: false, already_active: alreadyActive });
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    } catch (err: unknown) {
      jsonResponse(res, 500, {
        error: err instanceof Error ? err.message : "Internal Server Error",
      });
    }
  }

  const server = http.createServer((req, res) => {
    void handleRequest(req, res);
  });

  return {
    listen(): void {
      server.listen(port, () => {
        logger.debug(`Health server listening on http://localhost:${port}/health`);
      });
    },
    close(): void {
      server.close();
    },
  };
}
