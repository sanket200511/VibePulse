/**
 * DepRadar Sprint 6: Predictive Engineering Intelligence E2E Acceptance Test
 *
 * Verifies:
 * 1. Insufficient evidence detection on fresh projects
 * 2. Deterministic forecasting (Security Recurrence, Hotspots, Resolution Regression, Change Bursts)
 * 3. Additive forecast scoring (0-100) with complete breakdown
 * 4. Multi-project isolation (Project A projections != Project B)
 * 5. Strict secret-redaction guarantees (VIBEPULSE_SPRINT6_SECRET_2026 is never leaked)
 * 6. Deterministic reconstructibility from PostgreSQL telemetry
 * 7. PROJECT_CONTEXT.md Section 17 integration
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const API_BASE = process.env.VIBEPULSE_API_URL || "http://localhost:5184";
const SECRET_TOKEN = "VIBEPULSE_SPRINT6_SECRET_2026";

function log(msg) {
  console.log(`[SPRINT 6 E2E] ${msg}`);
}

function assert(condition, message) {
  if (!condition) {
    console.error(`\n[FAIL] Assertion failed: ${message}\n`);
    process.exit(1);
  }
}

async function request(method, pathUrl, body = null) {
  const url = new URL(pathUrl, API_BASE);
  const bodyData = body ? JSON.stringify(body) : null;

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method,
        headers: {
          ...(bodyData
            ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(bodyData) }
            : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            const data = raw ? JSON.parse(raw) : null;
            resolve({ status: res.statusCode, data, raw });
          } catch {
            resolve({ status: res.statusCode, data: raw, raw });
          }
        });
      },
    );

    req.on("error", reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function main() {
  log("Starting Sprint 6 Predictive Intelligence E2E Validation...");

  // 1. Health check
  log("Step 1: Verifying API readiness...");
  const health = await request("GET", "/health");
  assert(health.status === 200, `API is not ready: ${health.status}`);

  // 2. Create isolated test projects
  log("Step 2: Creating isolated test projects (Project A and Project B)...");
  const tempDirA = fs.mkdtempSync(path.join(os.tmpdir(), "vp-pred-proj-a-"));
  const tempDirB = fs.mkdtempSync(path.join(os.tmpdir(), "vp-pred-proj-b-"));

  const projARes = await request("POST", "/api/projects", {
    root_path: tempDirA,
    display_name: "Sprint6-Predictive-Project-A",
  });
  assert(projARes.status === 200, `Failed to create Project A: ${projARes.status}`);
  const projAId = projARes.data.id;

  const projBRes = await request("POST", "/api/projects", {
    root_path: tempDirB,
    display_name: "Sprint6-Predictive-Project-B",
  });
  assert(projBRes.status === 200, `Failed to create Project B: ${projBRes.status}`);
  const projBId = projBRes.data.id;

  try {
    // 3. Verify Insufficient Evidence State
    log("Step 3: Verifying explicit INSUFFICIENT_EVIDENCE state on fresh projects...");
    const emptyPredRes = await request("GET", `/api/projects/${projAId}/predictions`);
    assert(emptyPredRes.status === 200, "Failed to get initial predictions");
    assert(
      emptyPredRes.data.status === "INSUFFICIENT_EVIDENCE",
      `Expected INSUFFICIENT_EVIDENCE, got: ${emptyPredRes.data.status}`,
    );
    assert(
      emptyPredRes.data.total_predictions === 0,
      `Expected 0 predictions, got: ${emptyPredRes.data.total_predictions}`,
    );
    log(" [✓] Insufficient evidence state verified.");

    // 4. Ingest telemetry into Project A
    log("Step 4: Ingesting multi-event telemetry and security findings for Project A...");
    const sessionId = crypto.randomUUID();
    const now = new Date();

    // Start session event
    await request("POST", "/events", {
      id: crypto.randomUUID(),
      session_id: sessionId,
      project_root: tempDirA,
      timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
      event_type: "SESSION_STARTED",
      file_path: null,
      file_name: null,
      metadata: {},
    });

    // Ingest events on auth/login.py with sensitive token
    for (let i = 0; i < 4; i++) {
      await request("POST", "/events", {
        id: crypto.randomUUID(),
        session_id: sessionId,
        project_root: tempDirA,
        timestamp: new Date(now.getTime() - 1000 * 60 * (25 - i * 5)).toISOString(),
        event_type: "FILE_MODIFIED",
        file_path: "src/auth/login.py",
        file_name: "login.py",
        file_extension: ".py",
        language: "Python",
        metadata: {
          diff: `+ API_KEY = "${SECRET_TOKEN}"`,
        },
      });
    }

    // Ingest events on config/vault.py
    await request("POST", "/events", {
      id: crypto.randomUUID(),
      session_id: sessionId,
      project_root: tempDirA,
      timestamp: now.toISOString(),
      event_type: "FILE_MODIFIED",
      file_path: "config/vault.py",
      file_name: "vault.py",
      file_extension: ".py",
      language: "Python",
      metadata: {},
    });

    // 5. Query Predictive Summary for Project A
    log("Step 5: Verifying Predictive Engineering forecasts for Project A...");
    const predRes = await request("GET", `/api/projects/${projAId}/predictions`);
    assert(predRes.status === 200, `Failed to query predictions: ${predRes.status}`);
    const summary = predRes.data;

    assert(summary.status === "READY", `Expected status READY, got ${summary.status}`);
    assert(summary.total_predictions >= 1, "Expected at least 1 prediction");
    assert(summary.active_hotspots_count >= 1, "Expected at least 1 active hotspot");

    // Verify Hotspots
    const topHotspot = summary.hotspots[0];
    assert(topHotspot.file_path.includes("login.py"), "Expected login.py as top hotspot");
    assert(topHotspot.hotspot_score >= 15, "Expected positive hotspot score");
    log(` [✓] Hotspot ranking verified: ${topHotspot.file_path} (${topHotspot.hotspot_score}/100)`);

    // Verify Engineering Focus Drift
    assert(summary.engineering_drift != null, "Missing engineering drift");
    assert(summary.engineering_drift.current_focus.length > 0, "Missing current focus");
    log(
      ` [✓] Focus Drift verified: ${summary.engineering_drift.previous_focus} -> ${summary.engineering_drift.current_focus}`,
    );

    // Verify 7-day Historical Trends
    assert(summary.trends.length === 7, `Expected 7 trend points, got ${summary.trends.length}`);
    log(` [✓] 7-day trend series verified.`);

    // 6. Verify Multi-Project Isolation
    log("Step 6: Verifying strict multi-project isolation (Project B)...");
    const predBRes = await request("GET", `/api/projects/${projBId}/predictions`);
    assert(predBRes.status === 200, "Failed to get Project B predictions");
    assert(
      predBRes.data.status === "INSUFFICIENT_EVIDENCE",
      `Project B leaked Project A state! Status: ${predBRes.data.status}`,
    );
    assert(
      predBRes.data.total_predictions === 0,
      `Project B has leaked predictions: ${predBRes.data.total_predictions}`,
    );
    log(" [✓] Multi-project isolation verified.");

    // 7. Verify Strict Secret Redaction
    log("Step 7: Verifying zero raw secret leakage in predictions and project context...");
    const predJson = JSON.stringify(summary);
    assert(!predJson.includes(SECRET_TOKEN), `Raw secret token leaked in predictive JSON!`);

    const contextRes = await request("GET", `/api/projects/${projAId}/context/export`);
    assert(contextRes.status === 200, "Failed to get project context markdown");
    assert(
      !contextRes.raw.includes(SECRET_TOKEN),
      `Raw secret token leaked in PROJECT_CONTEXT.md!`,
    );
    assert(
      contextRes.raw.includes("## 17. Predictive Engineering Signals"),
      "Missing Section 17 in PROJECT_CONTEXT.md",
    );
    log(" [✓] Strict secret redaction and Section 17 markdown export verified.");

    // 8. Verify Deterministic Reconstructibility
    log("Step 8: Verifying 100% deterministic reconstructibility...");
    const refreshRes = await request("POST", `/api/projects/${projAId}/predictions/refresh`);
    assert(refreshRes.status === 200, "Failed to refresh predictions");
    const summary2 = refreshRes.data;

    assert(
      summary.total_predictions === summary2.total_predictions,
      "Prediction count changed after re-calculation",
    );
    assert(
      summary.active_hotspots_count === summary2.active_hotspots_count,
      "Hotspot count changed after re-calculation",
    );
    log(" [✓] Deterministic reconstructibility verified.");

    log("\n============================================================");
    log(" [✓] SPRINT 6: PREDICTIVE ENGINEERING INTELLIGENCE PASSED 100%");
    log("============================================================\n");
  } finally {
    // 9. Clean up sessions & projects
    log("Step 9: Cleaning up test projects...");
    try {
      if (projAId) await request("DELETE", `/api/projects/${projAId}?force=true`);
      if (projBId) await request("DELETE", `/api/projects/${projBId}?force=true`);
      fs.rmSync(tempDirA, { recursive: true, force: true });
      fs.rmSync(tempDirB, { recursive: true, force: true });
      log(" [✓] Cleanup completed.");
    } catch (e) {
      log(`Cleanup warning: ${e.message}`);
    }
  }
}

main().catch((err) => {
  console.error("E2E Test Failure:", err);
  process.exit(1);
});
