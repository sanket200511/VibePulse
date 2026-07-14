/**
 * Daemon configuration.
 *
 * Reads environment variables exactly once at startup and returns a typed
 * config object. No component downstream of this module may read
 * process.env directly — all receive a DaemonConfig instead, which keeps
 * them independently testable.
 */

export interface DaemonConfig {
  /** Trailing-edge debounce window per file, in milliseconds. */
  debounceMs: number;
  /** Maximum number of publish-ready events held in the in-memory queue. */
  queueMaxSize: number;
  /** Maximum retry attempts for CRITICAL-priority events (observation boundaries). */
  retryMaxCritical: number;
  /** Maximum retry attempts for NORMAL-priority events (file events). */
  retryMaxNormal: number;
  /** Base delay for exponential backoff between retries, in milliseconds. */
  retryBackoffBaseMs: number;
}

const DEFAULTS: DaemonConfig = {
  debounceMs: 300,
  queueMaxSize: 500,
  retryMaxCritical: 10,
  retryMaxNormal: 3,
  retryBackoffBaseMs: 200,
};

function parsePositiveInt(value: string | undefined, name: string, defaultValue: number): number {
  if (value === undefined || value === "") return defaultValue;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new RangeError(`${name} must be a positive integer, got: ${JSON.stringify(value)}`);
  }
  return parsed;
}

/**
 * Loads and validates daemon configuration from environment variables.
 *
 * Throws RangeError if any present variable cannot be parsed as a positive
 * integer, so misconfigured deployments fail fast at startup rather than
 * silently using defaults.
 */
export function loadConfig(): DaemonConfig {
  return {
    debounceMs: parsePositiveInt(process.env["DEBOUNCE_MS"], "DEBOUNCE_MS", DEFAULTS.debounceMs),
    queueMaxSize: parsePositiveInt(
      process.env["QUEUE_MAX_SIZE"],
      "QUEUE_MAX_SIZE",
      DEFAULTS.queueMaxSize,
    ),
    retryMaxCritical: parsePositiveInt(
      process.env["RETRY_MAX_CRITICAL"],
      "RETRY_MAX_CRITICAL",
      DEFAULTS.retryMaxCritical,
    ),
    retryMaxNormal: parsePositiveInt(
      process.env["RETRY_MAX_NORMAL"],
      "RETRY_MAX_NORMAL",
      DEFAULTS.retryMaxNormal,
    ),
    retryBackoffBaseMs: parsePositiveInt(
      process.env["RETRY_BACKOFF_BASE_MS"],
      "RETRY_BACKOFF_BASE_MS",
      DEFAULTS.retryBackoffBaseMs,
    ),
  };
}
