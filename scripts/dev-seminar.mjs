#!/usr/bin/env node
/**
 * VibePulse Seminar Supervisor
 * Orchestrates reliable, long-running local development stack for presentations.
 *
 * Capabilities:
 * - Pre-flight environment check (Postgres, Redis, Python, Node)
 * - Ordered service startup with health gating (API -> Dashboard -> Daemon)
 * - Isolated process supervision with automatic resilient restart
 * - Periodic non-intrusive health heartbeat (every 10s)
 * - Clean multi-process termination on SIGINT/SIGTERM (Windows-safe)
 */

import { spawn } from "child_process";
import http from "http";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const SERVICES = {
  api: {
    name: "API",
    url: "http://localhost:8000/health",
    port: 8000,
    command: "uv",
    args: ["run", "uvicorn", "app.main:app", "--port", "8000"],
    cwd: path.join(ROOT_DIR, "apps", "api"),
    color: "\x1b[34m", // Blue
  },
  dashboard: {
    name: "Dashboard",
    url: "http://localhost:3000",
    port: 3000,
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    args: ["--filter", "@vibepulse/dashboard", "dev"],
    cwd: ROOT_DIR,
    color: "\x1b[32m", // Green
  },
  daemon: {
    name: "Daemon",
    url: "http://localhost:9000/health",
    port: 9000,
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    args: ["--filter", "@vibepulse/daemon", "dev"],
    cwd: ROOT_DIR,
    color: "\x1b[35m", // Magenta
  },
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";

function log(prefix, msg, color = RESET) {
  const ts = new Date().toLocaleTimeString();
  console.log(`${color}[${prefix}] ${RESET}[${ts}] ${msg}`);
}

function checkTcpPort(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(true);
      }
    });

    socket.on("timeout", () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.on("error", () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.connect(port, host);
  });
}

function checkHttpEndpoint(url, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForService(key, maxAttempts = 30, intervalMs = 1000) {
  const svc = SERVICES[key];
  for (let i = 1; i <= maxAttempts; i++) {
    const isUp = await checkHttpEndpoint(svc.url);
    if (isUp) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

// ── State Management ────────────────────────────────────────────────────────
const processes = {
  api: null,
  dashboard: null,
  daemon: null,
};

const restartCounts = {
  api: 0,
  dashboard: 0,
  daemon: 0,
};

let isShuttingDown = false;

function spawnService(key) {
  if (isShuttingDown) return;
  const svc = SERVICES[key];

  log(svc.name, `Starting process (${svc.command} ${svc.args.join(" ")})...`, svc.color);

  const proc = spawn(svc.command, svc.args, {
    cwd: svc.cwd,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  processes[key] = proc;

  proc.stdout.on("data", (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (line.trim()) {
        log(svc.name, line.trimEnd(), svc.color);
      }
    }
  });

  proc.stderr.on("data", (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (line.trim()) {
        log(svc.name, line.trimEnd(), svc.color);
      }
    }
  });

  proc.on("close", (code) => {
    processes[key] = null;
    if (isShuttingDown) return;

    log(
      "SUPERVISOR",
      `${RED}[CRITICAL] ${svc.name} process exited with code ${code}.${RESET}`,
      RED
    );

    restartCounts[key]++;
    if (restartCounts[key] > 10) {
      log(
        "SUPERVISOR",
        `${RED}Exceeded maximum restart attempts (10) for ${svc.name}. Halting automatic restart.${RESET}`,
        RED
      );
      return;
    }

    log(
      "SUPERVISOR",
      `${YELLOW}Restarting ${svc.name} in 2 seconds (Attempt ${restartCounts[key]}/10)...${RESET}`,
      YELLOW
    );
    setTimeout(() => {
      if (!isShuttingDown) {
        spawnService(key);
      }
    }, 2000);
  });
}

function shutdownAll(signal = "SIGINT") {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${YELLOW}[SUPERVISOR] Received ${signal}. Shutting down all VibePulse services...${RESET}`);

  for (const [key, proc] of Object.entries(processes)) {
    if (proc && !proc.killed) {
      log("SUPERVISOR", `Terminating ${SERVICES[key].name} (PID: ${proc.pid})...`, YELLOW);
      try {
        if (process.platform === "win32") {
          spawn("taskkill", ["/pid", proc.pid.toString(), "/T", "/F"]);
        } else {
          proc.kill("SIGTERM");
        }
      } catch (err) {
        // Ignore kill errors during teardown
      }
    }
  }

  setTimeout(() => {
    console.log(`${GREEN}[SUPERVISOR] Stack teardown complete. Goodbye!${RESET}\n`);
    process.exit(0);
  }, 1000);
}

process.on("SIGINT", () => shutdownAll("SIGINT"));
process.on("SIGTERM", () => shutdownAll("SIGTERM"));

// ── Main Orchestration ──────────────────────────────────────────────────────
async function main() {
  console.log(`
${CYAN}${BOLD}====================================================
           VIBEPULSE SEMINAR SUPERVISOR             
====================================================${RESET}
PostgreSQL : 5432 (Local)
Redis      : Cloud
API        : http://localhost:8000
Dashboard  : http://localhost:3000
Daemon     : http://localhost:9000
====================================================
`);

  // Step 1: Pre-flight checks
  log("SUPERVISOR", "Running pre-flight database readiness checks...", CYAN);
  const pgUp = await checkTcpPort("127.0.0.1", 5432);
  if (!pgUp) {
    console.error(`${RED}[ERROR] Local PostgreSQL is not reachable on port 5432! Please ensure PostgreSQL service is running.${RESET}`);
    process.exit(1);
  }
  log("SUPERVISOR", `${GREEN}[✓] PostgreSQL reachable on localhost:5432${RESET}`, GREEN);

  // Step 2: Start API
  log("SUPERVISOR", "Launching FastAPI Backend on port 8000...", CYAN);
  spawnService("api");
  const apiReady = await waitForService("api", 35, 1000);
  if (!apiReady) {
    log("SUPERVISOR", `${RED}[WARNING] API took longer than 35s to respond on /health, continuing startup...${RESET}`, RED);
  } else {
    log("SUPERVISOR", `${GREEN}[✓] API is HEALTHY (http://localhost:8000/health)${RESET}`, GREEN);
  }

  // Step 3: Start Dashboard
  log("SUPERVISOR", "Launching React/Vite Dashboard on port 3000...", CYAN);
  spawnService("dashboard");
  const dashReady = await waitForService("dashboard", 25, 1000);
  if (!dashReady) {
    log("SUPERVISOR", `${RED}[WARNING] Dashboard took longer than 25s to respond on port 3000, continuing startup...${RESET}`, RED);
  } else {
    log("SUPERVISOR", `${GREEN}[✓] Dashboard is HEALTHY (http://localhost:3000)${RESET}`, GREEN);
  }

  // Step 4: Start Telemetry Daemon
  log("SUPERVISOR", "Launching Telemetry Daemon on port 9000...", CYAN);
  spawnService("daemon");
  const daemonReady = await waitForService("daemon", 20, 1000);
  if (!daemonReady) {
    log("SUPERVISOR", `${RED}[WARNING] Daemon took longer than 20s to respond on port 9000, continuing startup...${RESET}`, RED);
  } else {
    log("SUPERVISOR", `${GREEN}[✓] Daemon is HEALTHY (http://localhost:9000/health)${RESET}`, GREEN);
  }

  console.log(`
${GREEN}${BOLD}====================================================
 [✓] ALL VIBEPULSE SERVICES ARE OPERATIONAL & MONITORED
====================================================${RESET}
 Dashboard  : ${CYAN}http://localhost:3000${RESET}
 API Docs   : ${CYAN}http://localhost:8000/docs${RESET}
 Daemon API : ${CYAN}http://localhost:9000/health${RESET}
 Supervisor : Active (Health check heartbeat every 10s)
====================================================
`);

  // Step 5: Continuous Health Monitoring Heartbeat
  setInterval(async () => {
    if (isShuttingDown) return;
    const [apiOk, dashOk, daemonOk] = await Promise.all([
      checkHttpEndpoint(SERVICES.api.url),
      checkHttpEndpoint(SERVICES.dashboard.url),
      checkHttpEndpoint(SERVICES.daemon.url),
    ]);

    if (!apiOk) log("HEARTBEAT", `${RED}[ALERT] API health check failed!${RESET}`, RED);
    if (!dashOk) log("HEARTBEAT", `${RED}[ALERT] Dashboard health check failed!${RESET}`, RED);
    if (!daemonOk) log("HEARTBEAT", `${RED}[ALERT] Daemon health check failed!${RESET}`, RED);

    if (apiOk && dashOk && daemonOk) {
      log("HEARTBEAT", `${GREEN}Stack healthy [API ✓ | Dashboard ✓ | Daemon ✓]${RESET}`, GREEN);
    }
  }, 10000);
}

main().catch((err) => {
  console.error(`${RED}[SUPERVISOR FATAL ERROR]${RESET}`, err);
  process.exit(1);
});
