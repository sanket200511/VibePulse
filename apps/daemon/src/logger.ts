/**
 * Minimal structured logger.
 *
 * Sprint 0: wraps console with level prefixes and timestamps.
 * Future: replace with pino or winston for structured JSON output.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

function formatMessage(level: LogLevel, message: string): string {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase().padEnd(5)}]`;
  return `${prefix} ${message}`;
}

export const logger = {
  debug: (message: string, ...args: unknown[]): void => {
    if (process.env["LOG_LEVEL"] === "debug") {
      console.debug(formatMessage("debug", message), ...args);
    }
  },
  info: (message: string, ...args: unknown[]): void => {
    console.info(formatMessage("info", message), ...args);
  },
  warn: (message: string, ...args: unknown[]): void => {
    console.warn(formatMessage("warn", message), ...args);
  },
  error: (message: string, ...args: unknown[]): void => {
    console.error(formatMessage("error", message), ...args);
  },
};
