/**
 * @vibepulse/config
 *
 * Shared configuration utilities:
 * - Type-safe environment variable parsing
 * - Common constants
 *
 * Keep this package free of runtime dependencies where possible.
 */

export { getEnv, requireEnv, parsePort } from "./env";
export type { EnvConfig } from "./env";
export {
  VIBEPULSE_PORTS,
  getApiPort,
  getDashboardPort,
  getDaemonPort,
  getApiUrl,
  getDashboardUrl,
  getDaemonUrl,
} from "./ports";
