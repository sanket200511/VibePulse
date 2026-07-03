/**
 * Minimal HTTP health server for the daemon.
 *
 * Exposes GET /health for Docker health checks and monitoring tools.
 * Uses Node's built-in http module to keep the daemon dependency-light.
 */

import http from "http";
import { logger } from "./logger";

const DAEMON_VERSION = "0.1.0";

export interface HealthServer {
  listen: () => void;
  close: () => void;
}

export function createHealthServer(port: number): HealthServer {
  const server = http.createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      const body = JSON.stringify({
        status: "healthy",
        version: DAEMON_VERSION,
        pid: process.pid,
        uptime: process.uptime(),
      });

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      });
      res.end(body);
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
