import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getEnvCandidatePaths(): string[] {
  return [
    path.resolve(process.cwd(), "apps/daemon/.env"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, "../../.env"),
  ];
}

/**
 * Parses CLI arguments for --watch or -w flag.
 */
export function getCliWatchTarget(): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;
    if (arg === "--watch" || arg === "-w" || arg === "--watch-root") {
      const val = args[i + 1];
      if (val && !val.startsWith("-")) {
        return val;
      }
    }
    if (arg.startsWith("--watch=")) {
      return arg.split("=")[1];
    }
    if (arg.startsWith("--watch-root=")) {
      return arg.split("=")[1];
    }
  }
  return undefined;
}

/**
 * Reads WATCH_ROOT directly from .env files on disk.
 */
export function readWatchRootFromEnv(): string | undefined {
  // If CLI override was passed, it remains static
  const cliTarget = getCliWatchTarget();
  if (cliTarget) {
    return cliTarget;
  }

  for (const envPath of getEnvCandidatePaths()) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            if (key === "WATCH_ROOT") {
              let val = trimmed.slice(eqIdx + 1).trim();
              if (
                (val.startsWith('"') && val.endsWith('"')) ||
                (val.startsWith("'") && val.endsWith("'"))
              ) {
                val = val.slice(1, -1);
              }
              return val;
            }
          }
        }
      } catch {
        // Continue
      }
    }
  }
  return undefined;
}

/**
 * Loads .env files for the daemon process.
 * Priority order:
 * 1. CLI flags (--watch / -w)
 * 2. apps/daemon/.env
 * 3. Repository root .env
 */
export function loadDaemonEnv(): void {
  for (const envPath of getEnvCandidatePaths()) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if (
              (val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))
            ) {
              val = val.slice(1, -1);
            }
            if (process.env[key] === undefined) {
              process.env[key] = val;
            }
          }
        }
      } catch {
        // Continue searching
      }
    }
  }

  // CLI argument overrides .env
  const cliTarget = getCliWatchTarget();
  if (cliTarget) {
    process.env["WATCH_ROOT"] = cliTarget;
  }
}

/**
 * Watches .env files on disk and triggers a callback when WATCH_ROOT changes.
 * Enables zero-restart live project switching directly from .env editing.
 */
export function watchEnvFile(onWatchRootChange: (newRoot: string) => void): () => void {
  let lastKnownRoot = readWatchRootFromEnv();
  const watchedPaths: string[] = [];

  for (const envPath of getEnvCandidatePaths()) {
    if (fs.existsSync(envPath) && !watchedPaths.includes(envPath)) {
      watchedPaths.push(envPath);
      try {
        fs.watchFile(envPath, { interval: 500 }, () => {
          const currentRoot = readWatchRootFromEnv();
          if (currentRoot && currentRoot !== lastKnownRoot) {
            logger.info(`[EnvWatcher] Detected WATCH_ROOT change in ${envPath}: ${currentRoot}`);
            lastKnownRoot = currentRoot;
            process.env["WATCH_ROOT"] = currentRoot;
            onWatchRootChange(currentRoot);
          }
        });
      } catch (err) {
        logger.debug(`Could not attach watch to ${envPath}:`, err);
      }
    }
  }

  return () => {
    for (const envPath of watchedPaths) {
      try {
        fs.unwatchFile(envPath);
      } catch {
        // ignore
      }
    }
  };
}
