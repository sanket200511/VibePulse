/**
 * Health / control server tests.
 *
 * Tests run against a real http.Server bound to a free port.
 * No mocking of the HTTP layer — the tests exercise the full request/response
 * cycle to ensure routing and serialisation are correct.
 *
 * No network calls to the API. No filesystem access.
 */

import http from "http";
import { afterEach, describe, expect, it } from "vitest";
import { createHealthServer } from "./health-server";
import { createObservationGate } from "./observation-gate";

/** Send a simple HTTP request and return the parsed JSON response body. */
function request(
  method: string,
  port: number,
  path: string,
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ method, hostname: "127.0.0.1", port, path }, (res) => {
      let raw = "";
      res.on("data", (chunk: string) => (raw += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode ?? 0, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode ?? 0, body: raw });
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

// Use a port range unlikely to clash with the real daemon.
let port = 19100;
function nextPort(): number {
  return port++;
}

describe("createHealthServer", () => {
  let server: ReturnType<typeof createHealthServer>;

  afterEach(() => {
    server.close();
  });

  describe("GET /health", () => {
    it("returns 200 with status:healthy and observing:false when gate is closed", async () => {
      const gate = createObservationGate();
      const p = nextPort();
      server = createHealthServer(p, gate);
      server.listen();
      await new Promise((r) => setTimeout(r, 20)); // let server bind

      const { status, body } = await request("GET", p, "/health");
      expect(status).toBe(200);
      expect((body as Record<string, unknown>)["status"]).toBe("healthy");
      expect((body as Record<string, unknown>)["observing"]).toBe(false);
    });

    it("reflects observing:true when the gate is open", async () => {
      const gate = createObservationGate();
      gate.open();
      const p = nextPort();
      server = createHealthServer(p, gate);
      server.listen();
      await new Promise((r) => setTimeout(r, 20));

      const { body } = await request("GET", p, "/health");
      expect((body as Record<string, unknown>)["observing"]).toBe(true);
    });

    it("includes pid, uptime, and version fields", async () => {
      const gate = createObservationGate();
      const p = nextPort();
      server = createHealthServer(p, gate);
      server.listen();
      await new Promise((r) => setTimeout(r, 20));

      const { body } = await request("GET", p, "/health");
      const b = body as Record<string, unknown>;
      expect(typeof b["pid"]).toBe("number");
      expect(typeof b["uptime"]).toBe("number");
      expect(typeof b["version"]).toBe("string");
    });
  });

  describe("POST /control/observe/start", () => {
    it("opens the gate and responds with observing:true", async () => {
      const gate = createObservationGate();
      expect(gate.isOpen()).toBe(false);
      const p = nextPort();
      server = createHealthServer(p, gate);
      server.listen();
      await new Promise((r) => setTimeout(r, 20));

      const { status, body } = await request("POST", p, "/control/observe/start");
      expect(status).toBe(200);
      expect((body as Record<string, unknown>)["observing"]).toBe(true);
      expect(gate.isOpen()).toBe(true);
    });

    it("is idempotent — calling start twice keeps gate open", async () => {
      const gate = createObservationGate();
      const p = nextPort();
      server = createHealthServer(p, gate);
      server.listen();
      await new Promise((r) => setTimeout(r, 20));

      await request("POST", p, "/control/observe/start");
      await request("POST", p, "/control/observe/start");
      expect(gate.isOpen()).toBe(true);
    });
  });

  describe("POST /control/observe/stop", () => {
    it("closes the gate and responds with observing:false", async () => {
      const gate = createObservationGate();
      gate.open();
      const p = nextPort();
      server = createHealthServer(p, gate);
      server.listen();
      await new Promise((r) => setTimeout(r, 20));

      const { status, body } = await request("POST", p, "/control/observe/stop");
      expect(status).toBe(200);
      expect((body as Record<string, unknown>)["observing"]).toBe(false);
      expect(gate.isOpen()).toBe(false);
    });

    it("is idempotent — calling stop when already closed keeps gate closed", async () => {
      const gate = createObservationGate();
      const p = nextPort();
      server = createHealthServer(p, gate);
      server.listen();
      await new Promise((r) => setTimeout(r, 20));

      await request("POST", p, "/control/observe/stop");
      expect(gate.isOpen()).toBe(false);
    });
  });

  describe("round-trip", () => {
    it("start → /health shows observing:true; stop → /health shows observing:false", async () => {
      const gate = createObservationGate();
      const p = nextPort();
      server = createHealthServer(p, gate);
      server.listen();
      await new Promise((r) => setTimeout(r, 20));

      await request("POST", p, "/control/observe/start");
      const afterStart = await request("GET", p, "/health");
      expect((afterStart.body as Record<string, unknown>)["observing"]).toBe(true);

      await request("POST", p, "/control/observe/stop");
      const afterStop = await request("GET", p, "/health");
      expect((afterStop.body as Record<string, unknown>)["observing"]).toBe(false);
    });
  });

  describe("unknown routes", () => {
    it("returns 404 for an unknown path", async () => {
      const gate = createObservationGate();
      const p = nextPort();
      server = createHealthServer(p, gate);
      server.listen();
      await new Promise((r) => setTimeout(r, 20));

      const { status } = await request("GET", p, "/unknown");
      expect(status).toBe(404);
    });
  });
});
