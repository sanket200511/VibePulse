import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function runCmd(cmd, cwd = rootDir) {
  try {
    return {
      stdout: execSync(cmd, { cwd, stdio: "pipe", encoding: "utf-8" }).trim(),
      success: true,
    };
  } catch (e) {
    return { stdout: e.stdout ? e.stdout.toString().trim() : "", success: false };
  }
}

function check(name, testFn, failMsg = "Failed") {
  const result = testFn();
  if (result.pass) {
    console.log(`[PASS] ${name}`);
    return true;
  } else {
    console.log(`[FAIL] ${name}\n       ${result.reason || failMsg}`);
    return false;
  }
}

console.log("\n=========================");
console.log("    DepRadar Doctor     ");
console.log("=========================\n");

let allPassed = true;

// ── Environment ──
allPassed &= check("Node.js", () => {
  const res = runCmd("node --version");
  return { pass: res.success, reason: "Node.js is not installed or not in PATH." };
});
allPassed &= check("pnpm", () => {
  const res = runCmd("pnpm --version");
  return { pass: res.success, reason: "pnpm is not installed. Run: npm install -g pnpm" };
});
allPassed &= check("Python", () => {
  const res = runCmd("python --version");
  const res2 = runCmd("py --version");
  return { pass: res.success || res2.success, reason: "Python is not installed or not in PATH." };
});
allPassed &= check("uv", () => {
  const res = runCmd("uv --version");
  return {
    pass: res.success,
    reason: "uv is not installed. See https://docs.astral.sh/uv/getting-started/installation/",
  };
});

// ── Configuration ──
allPassed &= check("API configuration (.env)", () => {
  const exists = fs.existsSync(path.join(rootDir, "apps", "api", ".env"));
  return { pass: exists, reason: "apps/api/.env is missing." };
});
allPassed &= check("Daemon configuration (.env)", () => {
  const exists = fs.existsSync(path.join(rootDir, "apps", "daemon", ".env"));
  return { pass: exists, reason: "apps/daemon/.env is missing." };
});

// ── Database ──
allPassed &= check("PostgreSQL Status & Schema", () => {
  const apiDir = path.join(rootDir, "apps", "api");
  const res = runCmd("uv run python scripts/check_db.py", apiDir);
  const out = res.stdout;

  if (out === "PASS_HEALTHY") {
    return { pass: true };
  } else if (out === "FAIL_CONFIG") {
    return { pass: false, reason: "FastAPI config could not be loaded." };
  } else if (out === "FAIL_CREDENTIALS") {
    return {
      pass: false,
      reason: "PostgreSQL running on localhost:5432 but credentials in apps/api/.env are wrong.",
    };
  } else if (out === "FAIL_DB_NOT_EXIST") {
    return {
      pass: false,
      reason: "PostgreSQL reachable on localhost:5432 but database 'vibepulse' does not exist.",
    };
  } else if (out === "FAIL_CONNECTION") {
    return {
      pass: false,
      reason:
        "PostgreSQL is not reachable on localhost:5432. Please start the local PostgreSQL service.",
    };
  } else if (out === "FAIL_SCHEMA_MISSING") {
    return {
      pass: false,
      reason:
        "PostgreSQL reachable but schema is not initialized (missing tables). Run `pnpm setup`.",
    };
  } else if (out === "FAIL_MIGRATIONS_PENDING") {
    return {
      pass: false,
      reason: "Database exists but migrations are pending. Run `uv run alembic upgrade head`.",
    };
  } else {
    return { pass: false, reason: "Database health check failed with output:\n       " + out };
  }
});

console.log("\nOverall:");
if (allPassed) {
  console.log("DepRadar environment is READY.");
} else {
  console.log("DepRadar environment has issues.");
  console.log("\nSuggested fix:\n       pnpm setup");
}
process.exit(allPassed ? 0 : 1);
