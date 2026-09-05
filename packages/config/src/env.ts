/**
 * Type-safe environment variable helpers.
 *
 * Design decision: fail loudly on startup rather than silently serving
 * wrong values. Required vars throw immediately; optional vars return
 * undefined so callers are forced to handle the absent case.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EnvConfig {
  nodeEnv: "development" | "production" | "test";
  isDev: boolean;
  isProd: boolean;
  isTest: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the value of an environment variable, or undefined if not set.
 */
export function getEnv(key: string): string | undefined {
  return process.env[key];
}

/**
 * Returns the value of an environment variable, throwing if it is absent or empty.
 *
 * @example
 * const dbUrl = requireEnv("DATABASE_URL");
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(
      `[DepRadar] Required environment variable "${key}" is not set. ` +
        `Check your .env file or deployment configuration.`,
    );
  }
  return value;
}

/**
 * Parses a port number from an environment variable.
 * Falls back to the provided default if the variable is absent or invalid.
 */
export function parsePort(key: string, defaultPort: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return defaultPort;

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) {
    console.warn(
      `[DepRadar] Invalid port value for "${key}": "${raw}". ` +
        `Falling back to default port ${defaultPort}.`,
    );
    return defaultPort;
  }
  return parsed;
}

// ─── Convenience: parsed NODE_ENV ────────────────────────────────────────────

function resolveNodeEnv(): EnvConfig["nodeEnv"] {
  const raw = process.env["NODE_ENV"];
  if (raw === "production" || raw === "test") return raw;
  return "development";
}

export const env: EnvConfig = {
  nodeEnv: resolveNodeEnv(),
  get isDev() {
    return this.nodeEnv === "development";
  },
  get isProd() {
    return this.nodeEnv === "production";
  },
  get isTest() {
    return this.nodeEnv === "test";
  },
};
