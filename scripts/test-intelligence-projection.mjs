#!/usr/bin/env node
/**
 * scripts/test-intelligence-projection.mjs
 *
 * Sprint 2 — Project Intelligence Reconstructibility & Projection Verification
 *
 * Performs the mandatory end-to-end verification:
 *   1. Creates/observes a disposable project with multi-language & multi-category events.
 *   2. Generates initial Project Intelligence projection via POST /api/projects/{id}/context/refresh.
 *   3. Records initial intelligence (languages, frameworks, signals, focus, rankings, security).
 *   4. Deletes ONLY the `project_contexts` PostgreSQL row directly via SQL.
 *      Preserves: `development_events`, `sessions`, `event_analyses`, `projects`.
 *   5. Runs the refresh/reprojection endpoint (POST /api/projects/{id}/context/refresh).
 *   6. Generates Project Intelligence again.
 *   7. Compares the reconstructed result with the original result (verifying semantic equivalence).
 *   8. Verifies multi-project isolation (Project A vs Project B).
 *   9. Verifies project deletion cascade (Deleting disposable project cleans up its derived context).
 */

import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

console.log(
  `\n${ANSI.cyan}${ANSI.bold}[PROJECTION-AUDIT]${ANSI.reset} Running Sprint 2 Reconstructibility Proof...\n`,
);

try {
  const pythonScript = path.resolve(__dirname, "verify_intelligence_projection.py");
  execSync(`uv run python "${pythonScript}"`, {
    cwd: path.resolve(__dirname, "../apps/api"),
    encoding: "utf-8",
    stdio: "inherit",
  });
  console.log(
    `\n${ANSI.green}${ANSI.bold}=========================================================================${ANSI.reset}`,
  );
  console.log(
    `${ANSI.green}${ANSI.bold}  SPRINT 2 PROJECT INTELLIGENCE PROJECTION AUDIT: 100% VERIFIED  ${ANSI.reset}`,
  );
  console.log(
    `${ANSI.green}${ANSI.bold}=========================================================================${ANSI.reset}\n`,
  );
} catch (err) {
  console.error(`\n${ANSI.red}Audit execution failed:${ANSI.reset}`, err.message);
  process.exit(1);
}
