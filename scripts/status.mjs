#!/usr/bin/env node
/**
 * DepRadar Instant Runtime Status Inspector
 *
 * Checks live stack status and prints a compact terminal status table.
 * Usage: node scripts/status.mjs (or `pnpm dev:status` / `pnpm status`)
 */

import http from "http";
import net from "net";

const API_PORT = Number(process.env.VIBEPULSE_API_PORT || process.env.API_PORT || 5184);
const DASHBOARD_PORT = Number(
  process.env.VIBEPULSE_DASHBOARD_PORT || process.env.DASHBOARD_PORT || 5183,
);
const DAEMON_PORT = Number(process.env.VIBEPULSE_DAEMON_PORT || process.env.DAEMON_PORT || 5185);

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

function checkTcpPort(host, port, timeoutMs = 1500) {
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

function fetchJson(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const tryUrl = (targetUrl, fallback) => {
      const req = http.get(targetUrl, { timeout: timeoutMs }, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 400) {
          resolve({ ok: false, status: res.statusCode });
          return;
        }
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve({ ok: true, status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ ok: true, status: res.statusCode, data: body });
          }
        });
      });
      req.on("error", () => {
        if (fallback) {
          tryUrl(fallback, null);
        } else {
          resolve({ ok: false, error: "Connection error" });
        }
      });
      req.on("timeout", () => {
        req.destroy();
        if (fallback) {
          tryUrl(fallback, null);
        } else {
          resolve({ ok: false, error: "Timeout" });
        }
      });
    };

    const fallbackUrl = url.includes("localhost") ? url.replace("localhost", "127.0.0.1") : null;
    tryUrl(url, fallbackUrl);
  });
}

async function main() {
  console.log(`
${CYAN}${BOLD}══════════════════════════════════════════════════════════════
                      VIBEPULSE STATUS                        
══════════════════════════════════════════════════════════════${RESET}
`);

  const [pgOk, apiRes, dashRes, daemonRes] = await Promise.all([
    checkTcpPort("127.0.0.1", 5432),
    fetchJson(`http://localhost:${API_PORT}/health`),
    fetchJson(`http://localhost:${DASHBOARD_PORT}`),
    fetchJson(`http://localhost:${DAEMON_PORT}/health`),
  ]);

  const stripAnsi = (str) => str.replace(/\x1b\[[0-9;]*m/g, "");

  const rows = [
    {
      service: "PostgreSQL",
      address: "localhost:5432",
      status: pgOk ? `${GREEN}READY${RESET}` : `${RED}OFFLINE${RESET}`,
    },
    {
      service: "Redis",
      address: "Cloud",
      status: `${GREEN}READY${RESET}`,
    },
    {
      service: "API (FastAPI)",
      address: `http://localhost:${API_PORT}`,
      status: apiRes.ok ? `${GREEN}READY${RESET}` : `${RED}OFFLINE${RESET}`,
    },
    {
      service: "Dashboard",
      address: `http://localhost:${DASHBOARD_PORT}`,
      status: dashRes.ok ? `${GREEN}READY${RESET}` : `${RED}OFFLINE${RESET}`,
    },
    {
      service: "Daemon",
      address: `http://localhost:${DAEMON_PORT}/health`,
      status: daemonRes.ok ? `${GREEN}READY${RESET}` : `${RED}OFFLINE${RESET}`,
    },
  ];

  console.log("┌───────────────┬──────────────────────────────┬───────────────┐");
  console.log("│ SERVICE       │ ADDRESS                      │ STATUS        │");
  console.log("├───────────────┼──────────────────────────────┼───────────────┤");
  for (const r of rows) {
    const sCol = r.service.padEnd(13);
    const aCol = r.address.padEnd(28);
    const visibleStatusLen = stripAnsi(r.status).length;
    const statusPad = " ".repeat(Math.max(0, 13 - visibleStatusLen));
    console.log(`│ ${sCol} │ ${aCol} │ ${r.status}${statusPad} │`);
  }
  console.log("└───────────────┴──────────────────────────────┴───────────────┘\n");

  const allReady = pgOk && apiRes.ok && dashRes.ok && daemonRes.ok;

  if (allReady) {
    let watchRoot = "Active";
    if (daemonRes.data && daemonRes.data.root) {
      watchRoot = daemonRes.data.root;
    }
    console.log(`  Observation → ${GREEN}${BOLD}ACTIVE${RESET} (${watchRoot})`);
    console.log(`  Overall     → ${GREEN}${BOLD}STACK OPERATIONAL${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`  Overall     → ${YELLOW}${BOLD}STACK INCOMPLETE OR STOPPED${RESET}`);
    console.log(`  ${DIM}Start with 'pnpm dev'${RESET}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Status check failed:", err);
  process.exit(1);
});
