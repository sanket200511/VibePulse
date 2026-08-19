import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function runCmd(cmd, cwd = rootDir) {
  try {
    return { stdout: execSync(cmd, { cwd, stdio: "pipe", encoding: "utf-8" }).trim(), success: true };
  } catch (e) {
    return { stdout: e.stdout ? e.stdout.toString().trim() : "", success: false };
  }
}

function runCmdThrow(cmd, cwd = rootDir) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit", encoding: "utf-8" });
}

console.log("\n=========================");
console.log("   VibePulse Setup       ");
console.log("=========================\n");

// 1. Verify requirements
console.log("Checking prerequisites...");
const reqs = ["git", "node", "pnpm", "uv"];
for (const req of reqs) {
  const cmd = `${req} --version`;
  if (!runCmd(cmd).success) {
    console.error(`[FAIL] ${req} is required but not found in PATH.`);
    process.exit(1);
  }
}
console.log("[PASS] All prerequisites met (git, node, pnpm, uv).\n");

// 2. Setup .env files
console.log("Configuring environments...");
const envPaths = [
  { dir: ".", name: "Root" },
  { dir: "apps/api", name: "API" },
  { dir: "apps/daemon", name: "Daemon" }
];

for (const ep of envPaths) {
  const examplePath = path.join(rootDir, ep.dir, ".env.example");
  const envPath = path.join(rootDir, ep.dir, ".env");
  if (fs.existsSync(examplePath) && !fs.existsSync(envPath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log(`[CREATED] ${ep.dir}/.env`);
  } else if (!fs.existsSync(envPath)) {
    console.log(`[SKIP] No .env.example found for ${ep.name}`);
  } else {
    console.log(`[EXISTS] ${ep.dir}/.env`);
  }
}
console.log("");

// 3. Install Dependencies
console.log("Installing JS dependencies...");
runCmdThrow("pnpm install");

console.log("\nInstalling Python dependencies...");
runCmdThrow("uv sync", path.join(rootDir, "apps/api"));

// 4. Database Connectivity & Schema Initialization
console.log("\nVerifying PostgreSQL connectivity...");
const apiDir = path.join(rootDir, "apps/api");
const dbCheckRes = runCmd("uv run python scripts/check_db.py", apiDir);

if (!dbCheckRes.success && dbCheckRes.stdout === "FAIL_CONNECTION") {
  console.error("\n[FAIL] PostgreSQL is not reachable at localhost:5432.");
  console.error("       Please ensure your local PostgreSQL service is running.");
  console.error("       Required database: vibepulse | User: vibepulse | Port: 5432");
  process.exit(1);
} else if (!dbCheckRes.success && dbCheckRes.stdout === "FAIL_CREDENTIALS") {
  console.error("\n[FAIL] PostgreSQL authentication failed. Check credentials in apps/api/.env");
  process.exit(1);
} else if (!dbCheckRes.success && dbCheckRes.stdout === "FAIL_DB_NOT_EXIST") {
  console.error("\n[FAIL] PostgreSQL database 'vibepulse' does not exist.");
  console.error("       Please create database: CREATE DATABASE vibepulse;");
  process.exit(1);
}

console.log("[PASS] PostgreSQL is reachable.\n");
if (!dbCheckRes.success && dbCheckRes.stdout === "FAIL_SCHEMA_MISSING") {
  // If alembic_version has an entry but tables are missing, reset to base first
  runCmd("uv run alembic stamp base", apiDir);
}
console.log("Applying database migrations (idempotent)...");
runCmdThrow("uv run alembic upgrade head", apiDir);

// 5. Run Doctor
console.log("\nRunning final health checks...");
runCmdThrow("node scripts/doctor.mjs");
