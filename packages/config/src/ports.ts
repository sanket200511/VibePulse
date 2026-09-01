/**
 * Canonical port definitions and resolution helpers for VibePulse.
 *
 * Dedicated Namespace Mnemonic:
 * - 5184: VibePulse FastAPI API
 * - 5183: VibePulse Dashboard / Vite
 * - 5185: VibePulse Telemetry Daemon
 */

import { getEnv, parsePort } from "./env";

export const VIBEPULSE_PORTS = {
  API: 5184,
  DASHBOARD: 5183,
  DAEMON: 5185,
} as const;

export function getApiPort(): number {
  return parsePort("VIBEPULSE_API_PORT", parsePort("API_PORT", VIBEPULSE_PORTS.API));
}

export function getDashboardPort(): number {
  return parsePort(
    "VIBEPULSE_DASHBOARD_PORT",
    parsePort("DASHBOARD_PORT", VIBEPULSE_PORTS.DASHBOARD),
  );
}

export function getDaemonPort(): number {
  return parsePort("VIBEPULSE_DAEMON_PORT", parsePort("DAEMON_PORT", VIBEPULSE_PORTS.DAEMON));
}

export function getApiUrl(): string {
  return getEnv("VIBEPULSE_API_URL") || getEnv("API_URL") || `http://localhost:${getApiPort()}`;
}

export function getDashboardUrl(): string {
  return (
    getEnv("VIBEPULSE_DASHBOARD_URL") ||
    getEnv("DASHBOARD_URL") ||
    `http://localhost:${getDashboardPort()}`
  );
}

export function getDaemonUrl(): string {
  return (
    getEnv("VIBEPULSE_DAEMON_URL") || getEnv("DAEMON_URL") || `http://localhost:${getDaemonPort()}`
  );
}
