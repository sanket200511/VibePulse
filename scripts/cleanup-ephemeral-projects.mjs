#!/usr/bin/env node
/**
 * VibePulse Ephemeral Project Cleanup Utility
 *
 * Safely inspects and removes ephemeral/test/demo projects from PostgreSQL
 * while strictly protecting legitimate persistent workspaces (e.g. D:\Projects\Dabba).
 *
 * Modes:
 *   node scripts/cleanup-ephemeral-projects.mjs          -> DRY-RUN (default, non-destructive)
 *   node scripts/cleanup-ephemeral-projects.mjs --confirm -> DESTRUCTIVE (only confirmed ephemeral)
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(__dirname, "..", "apps", "api");
const isConfirm = process.argv.includes("--confirm");

const args = ["run", "python", "scripts/cleanup_ephemeral_projects.py"];
if (isConfirm) {
  args.push("--confirm");
}

const child = spawn("uv", args, {
  cwd: apiDir,
  stdio: "inherit",
  shell: true,
});

child.on("close", (code) => {
  process.exit(code || 0);
});
