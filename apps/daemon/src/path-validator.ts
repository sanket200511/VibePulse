import fs from "fs";
import path from "path";
import os from "os";

export interface PathValidationResult {
  valid: boolean;
  resolvedPath: string;
  exists: boolean;
  isDirectory: boolean;
  errorMessage?: string;
}

/**
 * Validates and resolves the WATCH_ROOT path safely and deterministically.
 * Uses native filesystem canonicalization on Windows to preserve true casing.
 */
export function validateAndResolveWatchRoot(rawPath: string | undefined): PathValidationResult {
  if (!rawPath || !rawPath.trim()) {
    return {
      valid: false,
      resolvedPath: "",
      exists: false,
      isDirectory: false,
      errorMessage:
        "WATCH_ROOT is missing or empty. Please specify a valid project directory in your .env, CLI (--watch), or environment.",
    };
  }

  const trimmed = rawPath.trim();
  let resolvedPath = path.resolve(trimmed);

  // Check safety: Drive roots (e.g. C:\ or /)
  const parsed = path.parse(resolvedPath);
  if (
    resolvedPath === parsed.root ||
    resolvedPath.toLowerCase() === parsed.root.toLowerCase() ||
    resolvedPath === "/"
  ) {
    return {
      valid: false,
      resolvedPath,
      exists: true,
      isDirectory: true,
      errorMessage: `Watching an entire drive root is not permitted for safety: "${resolvedPath}".`,
    };
  }

  // Check safety: System directories & home root
  const homeDir = os.homedir();
  const homeParent = path.dirname(homeDir);

  if (
    resolvedPath.toLowerCase() === homeParent.toLowerCase() ||
    resolvedPath.toLowerCase() === path.join(parsed.root, "users").toLowerCase() ||
    resolvedPath.toLowerCase() === path.join(parsed.root, "windows").toLowerCase() ||
    resolvedPath.toLowerCase() === path.join(parsed.root, "program files").toLowerCase() ||
    resolvedPath.toLowerCase() === "/home" ||
    resolvedPath.toLowerCase() === "/usr" ||
    resolvedPath.toLowerCase() === "/root"
  ) {
    return {
      valid: false,
      resolvedPath,
      exists: true,
      isDirectory: true,
      errorMessage: `Watching system directory is not permitted: "${resolvedPath}".`,
    };
  }

  if (resolvedPath.toLowerCase() === homeDir.toLowerCase()) {
    return {
      valid: false,
      resolvedPath,
      exists: true,
      isDirectory: true,
      errorMessage: `Watching the entire user home directory is not permitted: "${resolvedPath}". Please specify a sub-project directory.`,
    };
  }

  // Check existence
  let exists = false;
  let isDirectory = false;

  try {
    exists = fs.existsSync(resolvedPath);
    if (exists) {
      // Obtain true filesystem canonical casing
      try {
        if (typeof fs.realpathSync?.native === "function") {
          resolvedPath = fs.realpathSync.native(resolvedPath);
        } else {
          resolvedPath = fs.realpathSync(resolvedPath);
        }
      } catch {
        // Fallback to resolvedPath if realpathSync fails
      }
      const stats = fs.statSync(resolvedPath);
      isDirectory = stats.isDirectory();
    }
  } catch (err: unknown) {
    return {
      valid: false,
      resolvedPath,
      exists: false,
      isDirectory: false,
      errorMessage: `Error accessing path "${resolvedPath}": ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!exists) {
    return {
      valid: false,
      resolvedPath,
      exists: false,
      isDirectory: false,
      errorMessage: `WATCH_ROOT directory does not exist: "${resolvedPath}".`,
    };
  }

  if (!isDirectory) {
    return {
      valid: false,
      resolvedPath,
      exists: true,
      isDirectory: false,
      errorMessage: `WATCH_ROOT is a file, not a directory: "${resolvedPath}".`,
    };
  }

  return {
    valid: true,
    resolvedPath,
    exists: true,
    isDirectory: true,
  };
}
