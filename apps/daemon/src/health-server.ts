/**
 * Daemon HTTP server.
 *
 * Serves two concerns on a single port:
 *
 *   GET  /health                 — liveness probe (Docker / monitoring)
 *   POST /control/observe/start  — open the observation gate
 *   POST /control/observe/stop   — close the observation gate
 *
 * Responsibilities:
 *   - Report daemon health and current observation state
 *   - Open / close the ObservationGate on command
 *
 * Explicitly NOT responsible for:
 *   - Publishing events
 *   - Debouncing
 *   - File inspection
 *   - Retry logic
 */

import http from "http";
import { logger } from "./logger";
import type { ObservationGate } from "./observation-gate";

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

export function createHealthServer(port: number, gate: ObservationGate): HealthServer {
  const server = http.createServer((req, res) => {
    // GET /health — liveness probe
    if (req.url === "/health" && req.method === "GET") {
      jsonResponse(res, 200, {
        status: "healthy",
        version: DAEMON_VERSION,
        pid: process.pid,
        uptime: process.uptime(),
        observing: gate.isOpen(),
      });
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
      const alreadyActive = !gate.isOpen(); // already stopped
      gate.close();
      logger.info("Observation gate closed via control endpoint.");
      jsonResponse(res, 200, { observing: false, already_active: alreadyActive });
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
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
