import path from "path";
import { logger } from "./logger";

export interface RegisteredProject {
  id: string;
  display_name: string;
  root_path: string;
  created_at: string;
  updated_at: string;
}

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks if the FastAPI backend is healthy and reachable.
 */
export async function checkApiHealth(apiUrl: string): Promise<boolean> {
  const healthUrl = new URL("/health", apiUrl).toString();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(healthUrl, { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Registers or ensures a project exists in the VibePulse backend.
 * Idempotent: returns existing project record if already registered.
 */
export async function ensureProject(
  apiUrl: string,
  rootPath: string,
  displayName?: string,
): Promise<RegisteredProject> {
  const projectsEndpoint = new URL("/api/projects", apiUrl).toString();
  const name = displayName || path.basename(rootPath) || "Project";

  const response = await fetch(projectsEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      root_path: rootPath,
      display_name: name,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API returned HTTP ${response.status}: ${errorText || response.statusText}`);
  }

  return (await response.json()) as RegisteredProject;
}

/**
 * Registers a project with bounded exponential backoff retry.
 * Handles the startup race condition when FastAPI is still booting.
 */
export async function ensureProjectWithRetry(
  apiUrl: string,
  rootPath: string,
  displayName?: string,
  options: RetryOptions = {},
): Promise<RegisteredProject> {
  const maxAttempts = options.maxAttempts ?? 10;
  const initialDelay = options.initialDelayMs ?? 500;
  const maxDelay = options.maxDelayMs ?? 4000;
  const factor = options.factor ?? 2;

  let currentDelay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const isHealthy = await checkApiHealth(apiUrl);
      if (!isHealthy) {
        throw new Error(`FastAPI is not yet reachable at ${apiUrl}`);
      }

      const project = await ensureProject(apiUrl, rootPath, displayName);
      logger.info("[Telemetry] API connection established.");
      logger.info(
        `[Project Registration] Project registered successfully: ${project.display_name} (${project.id})`,
      );
      return project;
    } catch (err: unknown) {
      if (attempt === maxAttempts) {
        logger.error(
          `[Project Registration] Failed to register project after ${maxAttempts} attempts:`,
          err,
        );
        throw err;
      }

      logger.info(
        `[Telemetry] API unavailable — retrying in ${currentDelay}ms (attempt ${attempt}/${maxAttempts})...`,
      );
      await sleep(currentDelay);
      currentDelay = Math.min(currentDelay * factor, maxDelay);
    }
  }

  throw new Error(`Failed to register project after ${maxAttempts} attempts`);
}
