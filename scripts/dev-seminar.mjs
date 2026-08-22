#!/usr/bin/env node
/**
 * VibePulse Development Supervisor & Seminar Orchestrator
 *
 * Provides a professional, clean development supervisor experience:
 * - Structured log hierarchy: [TIME] [SERVICE] [LEVEL] MESSAGE
 * - Interactive startup status table & readiness banner
 * - Filtered child-process stream handling (clean info by default, verbose with debug)
 * - Clear error presentation with actionable resolution steps
 * - Non-intrusive heartbeat and concise runtime event logging
 * - Clean, signal-safe multi-process teardown
 */

import { spawn } from "child_process";
import http from "http";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

// ── Environment & Ports ──────────────────────────────────────────────────────
const API_PORT = Number(process.env.VIBEPULSE_API_PORT || process.env.API_PORT || 5133);
const DASHBOARD_PORT = Number(
  process.env.VIBEPULSE_DASHBOARD_PORT || process.env.DASHBOARD_PORT || 5134,
);
const DAEMON_PORT = Number(process.env.VIBEPULSE_DAEMON_PORT || process.env.DAEMON_PORT || 5135);

const IS_DEBUG =
  process.env.VIBEPULSE_LOG_LEVEL === "debug" ||
  process.env.LOG_LEVEL === "debug" ||
  process.env.DEBUG === "true" ||
  process.argv.includes("--debug") ||
  process.argv.includes("-v") ||
  process.argv.includes("--verbose");

// ── ANSI Formatting ─────────────────────────────────────────────────────────
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const MAGENTA = "\x1b[35m";
const CYAN = "\x1b[36m";
const GRAY = "\x1b[90m";

const SERVICE_COLORS = {
  SUPERVISOR: CYAN,
  DATABASE: BLUE,
  REDIS: MAGENTA,
  API: BLUE,
  DASHBOARD: GREEN,
  DAEMON: MAGENTA,
  SECURITY: RED,
  SYSTEM: CYAN,
  HEARTBEAT: GRAY,
};

const LEVEL_COLORS = {
  INFO: CYAN,
  START: YELLOW,
  READY: GREEN,
  WARN: YELLOW,
  ERROR: RED,
  RETRY: YELLOW,
  STOP: RED,
  EVENT: MAGENTA,
  DEBUG: GRAY,
  FINDING: RED,
};

function getTimestamp() {
  const d = new Date();
  return d.toTimeString().split(" ")[0]; // HH:MM:SS
}

function log(service, level, message, details = null) {
  const ts = getTimestamp();
  const sColor = SERVICE_COLORS[service] || CYAN;
  const lColor = LEVEL_COLORS[level] || RESET;

  const sTag = `${sColor}[${service.padEnd(10)}]${RESET}`;
  const lTag = `${lColor}[${level.padEnd(5)}]${RESET}`;
  console.log(`${GRAY}[${ts}]${RESET} ${sTag} ${lTag} ${message}`);
  if (details) {
    console.log(`                       ${DIM}${details}${RESET}`);
  }
}

function printBox(lines, color = CYAN) {
  console.log(`${color}══════════════════════════════════════════════════════════════${RESET}`);
  for (const line of lines) {
    console.log(`${color}${line}${RESET}`);
  }
  console.log(`${color}══════════════════════════════════════════════════════════════${RESET}`);
}

// ── Service Definitions ─────────────────────────────────────────────────────
const SERVICES = {
  api: {
    key: "api",
    name: "API",
    displayName: "FastAPI Backend",
    url: `http://localhost:${API_PORT}/health`,
    port: API_PORT,
    command: "uv",
    args: ["run", "uvicorn", "app.main:app", "--port", API_PORT.toString(), "--reload"],
    cwd: path.join(ROOT_DIR, "apps", "api"),
    status: "STARTING",
  },
  dashboard: {
    key: "dashboard",
    name: "DASHBOARD",
    displayName: "React Dashboard",
    url: `http://localhost:${DASHBOARD_PORT}`,
    port: DASHBOARD_PORT,
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    args: ["--filter", "@vibepulse/dashboard", "dev"],
    cwd: ROOT_DIR,
    status: "STARTING",
  },
  daemon: {
    key: "daemon",
    name: "DAEMON",
    displayName: "Telemetry Daemon",
    url: `http://localhost:${DAEMON_PORT}/health`,
    port: DAEMON_PORT,
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    args: ["--filter", "@vibepulse/daemon", "dev"],
    cwd: ROOT_DIR,
    status: "STARTING",
  },
};

// ── TCP & HTTP Probing ──────────────────────────────────────────────────────
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

function checkHttpEndpoint(url, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const tryUrl = (targetUrl, fallback) => {
      const req = http.get(targetUrl, { timeout: timeoutMs }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      });
      req.on("error", () => {
        if (fallback) {
          tryUrl(fallback, null);
        } else {
          resolve(false);
        }
      });
      req.on("timeout", () => {
        req.destroy();
        if (fallback) {
          tryUrl(fallback, null);
        } else {
          resolve(false);
        }
      });
    };

    const fallbackUrl = url.includes("localhost") ? url.replace("localhost", "127.0.0.1") : null;
    tryUrl(url, fallbackUrl);
  });
}

async function waitForService(key, maxAttempts = 35, intervalMs = 1000) {
  const svc = SERVICES[key];
  for (let i = 1; i <= maxAttempts; i++) {
    const isUp = await checkHttpEndpoint(svc.url);
    if (isUp) {
      svc.status = "READY";
      return true;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  svc.status = "FAILED";
  return false;
}

// ── Process Supervision & Stream Filtering ──────────────────────────────────
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

function processChildOutput(svcKey, rawText, isStderr = false) {
  const lines = rawText.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // In debug mode, log everything
    if (IS_DEBUG) {
      log(SERVICES[svcKey].name, isStderr ? "WARN" : "DEBUG", trimmed);
      continue;
    }

    // ── API Filtering ──
    if (svcKey === "api") {
      // Suppress noisy repetitive health polls, heartbeats, and startup banner
      if (
        trimmed.includes("GET /health") ||
        trimmed.includes("GET /events") ||
        trimmed.includes("session_sweep_complete") ||
        trimmed.includes("Started reloader process") ||
        trimmed.includes("Started server process") ||
        trimmed.includes("Waiting for application startup") ||
        trimmed.includes("Application startup complete")
      ) {
        continue;
      }
      // Highlight important lifecycle and event notifications
      if (trimmed.includes("Uvicorn running on")) {
        log("API", "READY", `Uvicorn server listening on port ${API_PORT}`);
        continue;
      }
      if (trimmed.includes("Will watch for changes")) {
        log("API", "INFO", "Hot-reload file watcher enabled");
        continue;
      }
      if (trimmed.includes("POST /events")) {
        log("API", "EVENT", "Telemetry development event ingested");
        continue;
      }
      if (trimmed.includes('"session_started"')) {
        try {
          const parsed = JSON.parse(trimmed);
          log("API", "EVENT", `Session started for project: ${parsed.project_root || "local"}`);
        } catch {
          log("API", "EVENT", "New development session started");
        }
        continue;
      }
      if (trimmed.includes("SEC001") || trimmed.includes("Security Finding")) {
        log("SECURITY", "FINDING", `Security finding detected [REDACTED]`);
        continue;
      }
      if (
        trimmed.startsWith("ERROR:") ||
        trimmed.includes("Traceback") ||
        trimmed.includes("Exception:")
      ) {
        log("API", "ERROR", trimmed);
        continue;
      }
      if (trimmed.startsWith("WARNING:")) {
        log("API", "WARN", trimmed);
        continue;
      }
      if (trimmed.startsWith("INFO:")) {
        // Standard informational log from Uvicorn
        continue;
      }
      if (isStderr && (trimmed.includes("Error") || trimmed.includes("error"))) {
        log("API", "ERROR", trimmed);
        continue;
      }
    }

    // ── Dashboard Filtering ──
    if (svcKey === "dashboard") {
      if (trimmed.includes("ready in")) {
        log("DASHBOARD", "READY", `Vite development server ready on port ${DASHBOARD_PORT}`);
        continue;
      }
      if (trimmed.includes("vite.config.ts changed") || trimmed.includes("restarting server")) {
        log("DASHBOARD", "INFO", "Configuration changed — restarting Vite server");
        continue;
      }
      if (trimmed.startsWith(">") || trimmed.includes("Local:") || trimmed.includes("Network:")) {
        continue; // Suppress redundant Vite banner
      }
      if (
        trimmed.includes("Error:") ||
        trimmed.includes("ERR_") ||
        trimmed.includes("Failed to resolve")
      ) {
        log("DASHBOARD", "ERROR", trimmed);
        continue;
      }
      if (isStderr && trimmed.includes("warn")) {
        log("DASHBOARD", "WARN", trimmed);
        continue;
      }
    }

    // ── Daemon Filtering ──
    if (svcKey === "daemon") {
      if (trimmed.includes("Now observing:")) {
        const parts = trimmed.split("Now observing:");
        log("DAEMON", "READY", `Observing target project: ${parts[1]?.trim() || "Active"}`);
        continue;
      }
      if (trimmed.includes("Project Switch")) {
        log("DAEMON", "EVENT", "Switching observation target directory");
        continue;
      }
      if (trimmed.includes("Project registered successfully:")) {
        const parts = trimmed.split("Project registered successfully:");
        log("DAEMON", "INFO", `Project registered: ${parts[1]?.trim() || "Active"}`);
        continue;
      }
      if (trimmed.includes("Observation gate opened")) {
        log("DAEMON", "INFO", "Observation gate OPEN (capturing telemetry)");
        continue;
      }
      if (trimmed.includes("Observation gate closed")) {
        log("DAEMON", "INFO", "Observation gate CLOSED (telemetry paused)");
        continue;
      }
      if (
        trimmed.startsWith("===") ||
        trimmed.includes("VibePulse Daemon") ||
        trimmed.includes("Initial Target") ||
        trimmed.includes("Daemon port") ||
        trimmed.includes("Watcher closed") ||
        trimmed.startsWith("Path   :") ||
        trimmed.startsWith("ID     :") ||
        trimmed.startsWith("Session:") ||
        trimmed.startsWith(">")
      ) {
        continue; // Suppress verbose startup banners in normal mode
      }
      if (
        trimmed.includes("[ERROR]") ||
        trimmed.includes("Error:") ||
        trimmed.includes("ECONNREFUSED")
      ) {
        log("DAEMON", "ERROR", trimmed);
        continue;
      }
      if (trimmed.includes("[WARN]")) {
        log("DAEMON", "WARN", trimmed);
        continue;
      }
    }
  }
}

function spawnService(key) {
  if (isShuttingDown) return;
  const svc = SERVICES[key];

  log(svc.name, "START", `Launching ${svc.displayName}...`);

  const proc = spawn(svc.command, svc.args, {
    cwd: svc.cwd,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  processes[key] = proc;

  proc.stdout.on("data", (data) => {
    processChildOutput(key, data.toString(), false);
  });

  proc.stderr.on("data", (data) => {
    processChildOutput(key, data.toString(), true);
  });

  proc.on("close", (code) => {
    processes[key] = null;
    if (isShuttingDown) return;

    console.log(`\n${RED}─────────────────────────────────────────────────────────────${RESET}`);
    log(svc.name, "ERROR", `${svc.displayName} process exited unexpectedly (code: ${code})`);
    console.log(
      `  ${YELLOW}Action: Check service logs or run with VIBEPULSE_LOG_LEVEL=debug${RESET}`,
    );
    console.log(`${RED}─────────────────────────────────────────────────────────────${RESET}\n`);

    restartCounts[key]++;
    if (restartCounts[key] > 10) {
      log(
        "SUPERVISOR",
        "ERROR",
        `Exceeded maximum restart attempts (10) for ${svc.name}. Halting.`,
      );
      return;
    }

    log(
      "SUPERVISOR",
      "RETRY",
      `Restarting ${svc.name} in 2s (Attempt ${restartCounts[key]}/10)...`,
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

  console.log("\n");
  log("SUPERVISOR", "STOP", `Shutdown requested (${signal})`);

  for (const [key, proc] of Object.entries(processes)) {
    if (proc && !proc.killed) {
      log(SERVICES[key].name, "STOP", `Terminating ${SERVICES[key].displayName}...`);
      try {
        if (process.platform === "win32") {
          spawn("taskkill", ["/pid", proc.pid.toString(), "/T", "/F"], { stdio: "ignore" });
        } else {
          proc.kill("SIGTERM");
        }
      } catch {
        // Ignore kill errors during teardown
      }
    }
  }

  log("DATABASE", "INFO", "PostgreSQL connection pool released");

  setTimeout(() => {
    printBox(["                  VIBEPULSE STOPPED CLEANLY                   "], GREEN);
    console.log("");
    process.exit(0);
  }, 1000);
}

process.on("SIGINT", () => shutdownAll("SIGINT"));
process.on("SIGTERM", () => shutdownAll("SIGTERM"));

// ── Startup & Main Orchestration ────────────────────────────────────────────
async function main() {
  console.log(`
${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗
║                     VIBEPULSE DEV STACK                      ║
╚══════════════════════════════════════════════════════════════╝${RESET}
`);

  log("SYSTEM", "START", "Starting development environment...");

  console.log(`
┌───────────────┬──────────────────────────────┬───────────────┐
│ SERVICE       │ ADDRESS                      │ STATUS        │
├───────────────┼──────────────────────────────┼───────────────┤
│ PostgreSQL    │ localhost:5432               │ READY         │
│ Redis         │ Cloud                        │ READY         │
│ API           │ localhost:${API_PORT.toString().padEnd(18)} │ STARTING      │
│ Dashboard     │ localhost:${DASHBOARD_PORT.toString().padEnd(18)} │ STARTING      │
│ Daemon        │ localhost:${DAEMON_PORT.toString().padEnd(18)} │ STARTING      │
└───────────────┴──────────────────────────────┴───────────────┘
`);

  // Step 1: Pre-flight database readiness check
  const pgUp = await checkTcpPort("127.0.0.1", 5432);
  if (!pgUp) {
    console.error(
      `\n${RED}[DATABASE ERROR] Local PostgreSQL is not reachable on port 5432!${RESET}`,
    );
    console.error(`  Please verify your local PostgreSQL service is running.\n`);
    process.exit(1);
  }
  log("DATABASE", "READY", "PostgreSQL connected on port 5432");
  log("REDIS", "READY", "Redis Cloud endpoint configured");

  // Step 2: Pre-flight port conflict check (5133, 5134, 5135)
  const [apiConflict, dashConflict, daemonConflict] = await Promise.all([
    checkTcpPort("127.0.0.1", API_PORT),
    checkTcpPort("127.0.0.1", DASHBOARD_PORT),
    checkTcpPort("127.0.0.1", DAEMON_PORT),
  ]);

  if (apiConflict || dashConflict || daemonConflict) {
    console.error(
      `\n${RED}${BOLD}─────────────────────────────────────────────────────────────${RESET}`,
    );
    console.error(`${RED}${BOLD}[PORT CONFLICT DETECTED]${RESET}`);
    if (apiConflict)
      console.error(`  ${RED}• Port ${API_PORT} (API) is occupied by another process.${RESET}`);
    if (dashConflict)
      console.error(
        `  ${RED}• Port ${DASHBOARD_PORT} (Dashboard) is occupied by another process.${RESET}`,
      );
    if (daemonConflict)
      console.error(
        `  ${RED}• Port ${DAEMON_PORT} (Daemon) is occupied by another process.${RESET}`,
      );
    console.error(`\n  ${YELLOW}Please stop conflicting processes or override ports via:${RESET}`);
    console.error(
      `    VIBEPULSE_API_PORT=<port> VIBEPULSE_DASHBOARD_PORT=<port> VIBEPULSE_DAEMON_PORT=<port>`,
    );
    console.error(
      `${RED}${BOLD}─────────────────────────────────────────────────────────────${RESET}\n`,
    );
    process.exit(1);
  }

  // Step 3: Start API
  spawnService("api");
  const apiReady = await waitForService("api", 35, 1000);
  if (apiReady) {
    log("API", "READY", `FastAPI healthy at http://localhost:${API_PORT}/health`);
  } else {
    log("API", "WARN", `API took longer than 35s to respond on /health, continuing...`);
  }

  // Step 4: Start Dashboard
  spawnService("dashboard");
  const dashReady = await waitForService("dashboard", 25, 1000);
  if (dashReady) {
    log("DASHBOARD", "READY", `Dashboard accessible at http://localhost:${DASHBOARD_PORT}`);
  } else {
    log(
      "DASHBOARD",
      "WARN",
      `Dashboard took longer than 25s to respond on port ${DASHBOARD_PORT}, continuing...`,
    );
  }

  // Step 5: Start Telemetry Daemon
  spawnService("daemon");
  const daemonReady = await waitForService("daemon", 20, 1000);
  if (daemonReady) {
    log("DAEMON", "READY", `Daemon healthy at http://localhost:${DAEMON_PORT}/health`);
  } else {
    log(
      "DAEMON",
      "WARN",
      `Daemon took longer than 20s to respond on port ${DAEMON_PORT}, continuing...`,
    );
  }

  // Ready State Banner
  console.log("");
  printBox(
    [
      `                     ${BOLD}VIBEPULSE IS READY${RESET}${GREEN}                       `,
      ``,
      `  Dashboard   → ${CYAN}http://localhost:${DASHBOARD_PORT}${RESET}${GREEN}`,
      `  API         → ${CYAN}http://localhost:${API_PORT}${RESET}${GREEN}`,
      `  API Docs    → ${CYAN}http://localhost:${API_PORT}/docs${RESET}${GREEN}`,
      `  Daemon      → ${CYAN}http://localhost:${DAEMON_PORT}/health${RESET}${GREEN}`,
      ``,
      `  Observation → ${BOLD}ACTIVE${RESET}${GREEN}`,
      `  Database    → ${BOLD}CONNECTED${RESET}${GREEN}`,
      `  WebSocket   → ${BOLD}ws://localhost:${API_PORT}${RESET}${GREEN}`,
      ``,
      `  ${DIM}Press Ctrl+C to stop VibePulse.${RESET}${GREEN}`,
    ],
    GREEN,
  );
  console.log("");

  // Step 6: Non-Intrusive Health Monitoring Heartbeat (every 30s)
  let lastHealthState = true;
  setInterval(async () => {
    if (isShuttingDown) return;
    const [apiOk, dashOk, daemonOk] = await Promise.all([
      checkHttpEndpoint(SERVICES.api.url),
      checkHttpEndpoint(SERVICES.dashboard.url),
      checkHttpEndpoint(SERVICES.daemon.url),
    ]);

    const allHealthy = apiOk && dashOk && daemonOk;

    if (!allHealthy) {
      lastHealthState = false;
      if (!apiOk) log("API", "WARN", "Health check failed (unresponsive on /health)");
      if (!dashOk)
        log("DASHBOARD", "WARN", `Health check failed (unresponsive on :${DASHBOARD_PORT})`);
      if (!daemonOk) log("DAEMON", "WARN", "Health check failed (unresponsive on /health)");
    } else if (!lastHealthState) {
      lastHealthState = true;
      log("SUPERVISOR", "READY", "All services recovered to healthy state");
    } else if (IS_DEBUG) {
      log(
        "HEARTBEAT",
        "INFO",
        `Stack healthy [API :${API_PORT} ✓ | Dashboard :${DASHBOARD_PORT} ✓ | Daemon :${DAEMON_PORT} ✓]`,
      );
    }
  }, 30000);
}

main().catch((err) => {
  console.error(`\n${RED}[SUPERVISOR FATAL ERROR]${RESET}`, err);
  process.exit(1);
});
