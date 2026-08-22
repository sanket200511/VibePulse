#!/usr/bin/env node
/**
 * VibePulse Project Lifecycle & Ephemeral Cleanup Verification Test
 *
 * Verifies:
 * 1. Persistent projects remain in PostgreSQL across operations.
 * 2. Ephemeral test projects are guaranteed to be cleaned up in finally blocks even on error.
 * 3. Force deletion (DELETE /api/projects/:id?force=true) bypasses active session lock and cascades cleanly.
 * 4. Multi-project isolation on deletion: deleting Project A leaves Project B completely intact.
 * 5. Normal DELETE without force=true still protects active observation sessions (HTTP 409).
 * 6. Guaranteed bounded execution: test never hangs and handles teardown cleanly.
 */

import http from "http";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { execSync, spawn } from "child_process";

const API_BASE = process.env.VIBEPULSE_API_URL || "http://localhost:5133";
const GLOBAL_TIMEOUT_MS = 25000;

// Global watchdog timer to guarantee the test never hangs indefinitely
let globalWatchdog = null;

function request(method, reqPath, body = null, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, API_BASE);
    const req = http.request(
      url,
      {
        method,
        headers: { "Content-Type": "application/json" },
        timeout: timeoutMs,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            const data = raw ? JSON.parse(raw) : null;
            resolve({ status: res.statusCode, data, raw });
          } catch {
            resolve({ status: res.statusCode, data: null, raw });
          }
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error(`HTTP request timed out after ${timeoutMs}ms: ${method} ${reqPath}`));
    });

    req.on("error", reject);

    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function killProcessTree(child) {
  if (!child) return;
  try {
    if (process.platform === "win32") {
      try {
        execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
      } catch {}
    } else {
      child.kill("SIGKILL");
    }
  } catch {}

  try {
    if (child.stdout) child.stdout.destroy();
    if (child.stderr) child.stderr.destroy();
    if (child.stdin) child.stdin.destroy();
    child.unref();
  } catch {}
}

async function ensureApiServer() {
  try {
    const res = await request("GET", "/health", null, 1500);
    if (res.status === 200) {
      console.log("✔ Connected to existing API server on " + API_BASE);
      return null;
    }
  } catch {}

  console.log("Starting temporary local FastAPI test instance...");
  const apiPort = new URL(API_BASE).port || "5133";
  const child = spawn("uv", ["run", "uvicorn", "app.main:app", "--port", apiPort], {
    cwd: path.resolve(process.cwd(), "apps/api"),
    shell: true,
    stdio: "pipe",
  });

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await request("GET", "/health", null, 1000);
      if (res.status === 200) {
        console.log("✔ Spawned API server successfully");
        return child;
      }
    } catch {}
  }

  killProcessTree(child);
  throw new Error("Failed to start FastAPI server within 10 seconds");
}

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] Assertion failed: ${message}`);
    throw new Error(message);
  }
}

async function run() {
  console.log("================================================================================");
  console.log("     VIBEPULSE PROJECT LIFECYCLE & EPHEMERAL CLEANUP VERIFICATION TEST          ");
  console.log("================================================================================\n");

  let serverProcess = null;

  globalWatchdog = setTimeout(() => {
    console.error(
      `\n❌ ERROR: Lifecycle test exceeded bounded timeout of ${GLOBAL_TIMEOUT_MS}ms! Aborting.`,
    );
    if (serverProcess) killProcessTree(serverProcess);
    process.exit(1);
  }, GLOBAL_TIMEOUT_MS);
  globalWatchdog.unref();

  serverProcess = await ensureApiServer();

  try {
    // Step 1: Health check
    const healthRes = await request("GET", "/health");
    assert(healthRes.status === 200, "FastAPI backend is healthy");
    console.log("✔ [1/6] API health verified.");

    // Step 2: Record baseline project count
    const initialListRes = await request("GET", "/api/projects");
    assert(initialListRes.status === 200, "Listed projects");
    const initialCount = initialListRes.data.projects.length;
    console.log(`✔ [2/6] Initial project count recorded: ${initialCount} projects.`);

    // Step 3: Test Active Session Guard (Normal DELETE returns 409 on active session)
    const tmpDirActive = fs.mkdtempSync(path.join(os.tmpdir(), "vp-active-test-"));
    let activeProjId = null;
    try {
      const regRes = await request("POST", "/api/projects", {
        root_path: tmpDirActive,
        display_name: "Active Guard Test Project",
      });
      assert(regRes.status === 200, "Registered active test project");
      activeProjId = regRes.data.id;

      // Create an active event / session
      const sessionId = crypto.randomUUID();
      await request("POST", "/events", {
        schema_version: 1,
        event_type: "FILE_MODIFIED",
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        project_root: tmpDirActive,
        file_path: "src/app.py",
        file_name: "app.py",
        file_extension: ".py",
        metadata: {},
      });

      // Attempt normal delete without force -> must return 409
      const delResNormal = await request("DELETE", `/api/projects/${activeProjId}`);
      assert(
        delResNormal.status === 409,
        `Expected 409 on active session delete, got ${delResNormal.status}`,
      );
      assert(
        delResNormal.data?.detail?.error === "PROJECT_ACTIVE",
        "Returned PROJECT_ACTIVE error detail",
      );
      console.log(
        "✔ [3/6] Normal DELETE on active project strictly rejected with HTTP 409 Conflict.",
      );

      // Delete with force=true -> must succeed (200)
      const delResForce = await request("DELETE", `/api/projects/${activeProjId}?force=true`);
      assert(delResForce.status === 200, `Expected 200 on force delete, got ${delResForce.status}`);
      assert(delResForce.data?.deleted === true, "Force deletion confirmed");
      activeProjId = null; // Mark cleaned
      console.log(
        "✔ [4/6] Force DELETE (DELETE /api/projects/:id?force=true) bypassed active lock and cleanly deleted.",
      );
    } finally {
      if (activeProjId) {
        try {
          const res = await request("DELETE", `/api/projects/${activeProjId}?force=true`);
          if (res.status !== 200 && res.status !== 404) {
            console.warn(`[WARN] Cleanup deletion for activeProjId returned status ${res.status}`);
          }
        } catch (err) {
          console.warn(`[WARN] Cleanup deletion error for activeProjId: ${err.message}`);
        }
      }
      try {
        fs.rmSync(tmpDirActive, { recursive: true, force: true });
      } catch {}
    }

    // Step 4: Test Multi-Project Isolation on Deletion
    const tmpDirA = fs.mkdtempSync(path.join(os.tmpdir(), "vp-iso-a-"));
    const tmpDirB = fs.mkdtempSync(path.join(os.tmpdir(), "vp-iso-b-"));
    let projAId = null,
      projBId = null;
    try {
      const regA = await request("POST", "/api/projects", {
        root_path: tmpDirA,
        display_name: "Iso A",
      });
      const regB = await request("POST", "/api/projects", {
        root_path: tmpDirB,
        display_name: "Iso B",
      });
      projAId = regA.data.id;
      projBId = regB.data.id;

      // Delete Project A
      const delA = await request("DELETE", `/api/projects/${projAId}?force=true`);
      assert(delA.status === 200, "Deleted Project A");
      projAId = null; // Mark cleaned

      // Verify Project B is untouched
      const checkB = await request("GET", `/api/projects/${projBId}`);
      assert(checkB.status === 200, "Project B remains intact");
      assert(checkB.data.display_name === "Iso B", "Project B identity preserved");
      console.log(
        "✔ [5/6] Multi-project isolation on deletion verified: Project B completely intact.",
      );
    } finally {
      if (projAId) {
        try {
          await request("DELETE", `/api/projects/${projAId}?force=true`);
        } catch (err) {
          console.warn(`[WARN] Cleanup deletion error for projAId: ${err.message}`);
        }
      }
      if (projBId) {
        try {
          await request("DELETE", `/api/projects/${projBId}?force=true`);
        } catch (err) {
          console.warn(`[WARN] Cleanup deletion error for projBId: ${err.message}`);
        }
      }
      try {
        fs.rmSync(tmpDirA, { recursive: true, force: true });
        fs.rmSync(tmpDirB, { recursive: true, force: true });
      } catch {}
    }

    // Step 5: Test Guaranteed Teardown on Exception in E2E Script Pattern
    const tmpDirSimErr = fs.mkdtempSync(path.join(os.tmpdir(), "vp-sim-err-"));
    let simErrProjId = null;
    let simulatedErrorCaught = false;

    try {
      const reg = await request("POST", "/api/projects", {
        root_path: tmpDirSimErr,
        display_name: "Simulated Error Project",
      });
      simErrProjId = reg.data.id;

      // Simulate an assertion error midway through test execution
      throw new Error("Simulated test failure midway through execution");
    } catch (err) {
      simulatedErrorCaught = true;
    } finally {
      // Teardown pattern
      if (simErrProjId) {
        try {
          const res = await request("DELETE", `/api/projects/${simErrProjId}?force=true`);
          if (res.status !== 200 && res.status !== 404) {
            console.warn(`[WARN] Cleanup deletion for simErrProjId returned status ${res.status}`);
          }
        } catch (err) {
          console.warn(`[WARN] Cleanup deletion error for simErrProjId: ${err.message}`);
        }
      }
      try {
        fs.rmSync(tmpDirSimErr, { recursive: true, force: true });
      } catch {}
    }

    assert(simulatedErrorCaught, "Simulated error was caught");
    // Verify that the project was deleted from the DB
    const checkSim = await request("GET", `/api/projects/${simErrProjId}`);
    assert(checkSim.status === 404, "Project was cleaned up despite error in test body");
    console.log("✔ [6/6] Guaranteed teardown on failure pattern verified (0 leftover projects).");

    // Step 6: Verify final project count matches initial count exactly (Net Δ = 0)
    const finalListRes = await request("GET", "/api/projects");
    const finalCount = finalListRes.data.projects.length;
    assert(
      finalCount === initialCount,
      `Net project change must be 0! Initial: ${initialCount}, Final: ${finalCount}`,
    );
    console.log(`\n✔ Net project change: Δ = 0 (Total projects in DB: ${finalCount})`);

    console.log(
      "\n================================================================================",
    );
    console.log("✅ ALL PROJECT LIFECYCLE & EPHEMERAL CLEANUP TESTS PASSED 100%!");
    console.log(
      "================================================================================\n",
    );
  } finally {
    if (globalWatchdog) clearTimeout(globalWatchdog);
    if (serverProcess) {
      killProcessTree(serverProcess);
    }
  }
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Lifecycle test failed:", err.message);
    process.exit(1);
  });
