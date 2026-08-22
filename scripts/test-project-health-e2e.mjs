#!/usr/bin/env node

/**
 * End-to-End Acceptance Test for Sprint 7:
 * UNIFIED PROJECT HEALTH & INTELLIGENCE ORCHESTRATOR
 *
 * Verifies:
 * 1. Explicit INSUFFICIENT_EVIDENCE state on clean/new projects.
 * 2. Synthesis of all 5 deterministic health dimensions.
 * 3. Deterministic "What Should I Do Next?" priority ranking.
 * 4. Multi-project isolation (Project A vs Project B).
 * 5. Strict secret redaction (VIBEPULSE_SPRINT7_SECRET_2026 masked).
 * 6. Section 18 export in PROJECT_CONTEXT.md.
 * 7. 100% Deterministic Reconstructibility (Result A == Result B).
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const API_BASE = process.env.VIBEPULSE_API_URL || process.env.API_BASE || "http://127.0.0.1:5133";
const SECRET_TOKEN = "VIBEPULSE_SPRINT7_SECRET_2026";

function log(msg) {
  console.log(`[SPRINT 7 E2E] ${msg}`);
}

function request(method, pathUrl, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, API_BASE);
    const req = http.request(
      url,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/markdown, */*",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            // Raw text fallback
          }
          resolve({ status: res.statusCode, data: json, raw: data });
        });
      },
    );
    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`\n[FAIL] Assertion failed: ${message}\n`);
    process.exit(1);
  }
}

async function run() {
  log("Starting Sprint 7 Unified Project Health E2E Validation...");

  // 1. Check API readiness
  log("Step 1: Verifying API readiness...");
  try {
    const health = await request("GET", "/health");
    assert(health.status === 200, "API is not healthy on " + API_BASE);
  } catch (err) {
    console.error("Could not connect to API:", err.message);
    process.exit(1);
  }

  // 2. Create isolated disposable temp directories for Project A and Project B
  log("Step 2: Creating isolated test projects (Project A and Project B)...");
  const tempDirA = fs.mkdtempSync(path.join(os.tmpdir(), "vp-health-proj-a-"));
  const tempDirB = fs.mkdtempSync(path.join(os.tmpdir(), "vp-health-proj-b-"));

  let projAId, projBId;

  try {
    const resA = await request("POST", "/api/projects", {
      root_path: tempDirA,
      display_name: "Sprint 7 Project A",
    });
    assert(resA.status === 200, "Failed to create Project A");
    projAId = resA.data.id;

    const resB = await request("POST", "/api/projects", {
      root_path: tempDirB,
      display_name: "Sprint 7 Project B",
    });
    assert(resB.status === 200, "Failed to create Project B");
    projBId = resB.data.id;

    // 3. Verify INSUFFICIENT_EVIDENCE on fresh project
    log("Step 3: Verifying explicit INSUFFICIENT_EVIDENCE state on fresh projects...");
    const initHealth = await request("GET", `/api/projects/${projAId}/health`);
    assert(initHealth.status === 200, "Failed to get initial health for Project A");
    assert(
      initHealth.data.status === "INSUFFICIENT_EVIDENCE",
      `Expected INSUFFICIENT_EVIDENCE, got ${initHealth.data.status}`,
    );
    assert(
      initHealth.data.overall_health_score === null,
      "Expected null overall score for insufficient evidence",
    );
    assert(
      initHealth.data.grade === "INSUFFICIENT_EVIDENCE",
      "Expected grade to be INSUFFICIENT_EVIDENCE",
    );
    assert(
      initHealth.data.top_priorities.length === 0,
      "Expected 0 priorities for insufficient evidence",
    );
    log(" [✓] Insufficient evidence state verified.");

    // 4. Ingest multi-event telemetry for Project A
    log("Step 4: Ingesting multi-event telemetry and security findings for Project A...");
    const sessionId = crypto.randomUUID();
    const now = new Date();

    const sessionRes = await request("POST", "/events", {
      id: crypto.randomUUID(),
      session_id: sessionId,
      project_root: tempDirA,
      timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
      event_type: "OBSERVATION_STARTED",
      file_path: "src/auth/login.py",
      file_name: "login.py",
      file_extension: ".py",
      language: "Python",
      metadata: {},
    });
    assert(
      [200, 201].includes(sessionRes.status),
      `Failed to start session: ${sessionRes.status} ${sessionRes.raw}`,
    );

    // Ingest file changes with sensitive token
    for (let i = 0; i < 4; i++) {
      const evRes = await request("POST", "/events", {
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
          line_count: 120 + i * 10,
          diff: `+ token = "${SECRET_TOKEN}"`,
        },
      });
      assert([200, 201].includes(evRes.status), `Failed to ingest file event: ${evRes.status}`);
    }

    // Ingest another subsystem file
    const vaultRes = await request("POST", "/events", {
      id: crypto.randomUUID(),
      session_id: sessionId,
      project_root: tempDirA,
      timestamp: new Date(now.getTime() - 1000 * 60 * 2).toISOString(),
      event_type: "FILE_MODIFIED",
      file_path: "config/vault.py",
      file_name: "vault.py",
      file_extension: ".py",
      language: "Python",
      metadata: {
        diff: `+ VAULT_KEY = "vlt_2026"`,
      },
    });
    assert(
      [200, 201].includes(vaultRes.status),
      `Failed to ingest vault event: ${vaultRes.status}`,
    );

    // 5. Query Unified Project Health for Project A
    log("Step 5: Verifying Unified Project Health & Five Dimensions for Project A...");
    const healthRes = await request("GET", `/api/projects/${projAId}/health`);
    assert(healthRes.status === 200, "Failed to get unified project health");
    const healthData = healthRes.data;

    assert(healthData.status === "READY", "Expected status READY");
    assert(
      typeof healthData.overall_health_score === "number" &&
        healthData.overall_health_score >= 0 &&
        healthData.overall_health_score <= 100,
      `Overall health score invalid: ${healthData.overall_health_score}`,
    );
    assert(
      ["EXCELLENT", "HEALTHY", "NEEDS_ATTENTION", "DEGRADED", "CRITICAL"].includes(
        healthData.grade,
      ),
      `Invalid health grade: ${healthData.grade}`,
    );

    // Verify 5 dimensions
    assert(healthData.security_health.weight === 0.25, "Invalid security_health weight");
    assert(healthData.engineering_stability.weight === 0.2, "Invalid engineering_stability weight");
    assert(healthData.incident_health.weight === 0.2, "Invalid incident_health weight");
    assert(healthData.resolution_health.weight === 0.15, "Invalid resolution_health weight");
    assert(
      healthData.predictive_risk_health.weight === 0.2,
      "Invalid predictive_risk_health weight",
    );

    log(
      ` [✓] Overall Health Score: ${healthData.overall_health_score}/100 (Grade: ${healthData.grade})`,
    );
    log(` [✓] Security Health: ${healthData.security_health.score}/100`);
    log(` [✓] Engineering Stability: ${healthData.engineering_stability.score}/100`);
    log(` [✓] Incident Health: ${healthData.incident_health.score}/100`);
    log(` [✓] Resolution Health: ${healthData.resolution_health.score}/100`);
    log(` [✓] Predictive Risk Health: ${healthData.predictive_risk_health.score}/100`);

    // Verify Actionable Priorities
    log("Step 6: Verifying 'What Should I Do Next?' priority engine...");
    const prioRes = await request("GET", `/api/projects/${projAId}/health/priorities`);
    assert(prioRes.status === 200, "Failed to get project priorities");
    const priorities = prioRes.data;
    assert(Array.isArray(priorities), "Expected array of priorities");

    if (priorities.length > 0) {
      assert(priorities[0].rank === 1, "First priority must have rank 1");
      assert(priorities[0].priority_score >= 0, "Priority score must be positive");
      assert(priorities[0].why_ranked_highly.length > 0, "Priority must have explanation");
      assert(priorities[0].recommended_action.length > 0, "Priority must have recommended action");
      log(` [✓] Top Priority (#1): ${priorities[0].title} [${priorities[0].category}]`);
    }

    // 7. Verify Multi-Project Isolation
    log("Step 7: Verifying strict multi-project isolation (Project B)...");
    const healthBRes = await request("GET", `/api/projects/${projBId}/health`);
    assert(healthBRes.status === 200, "Failed to get health for Project B");
    assert(
      healthBRes.data.status === "INSUFFICIENT_EVIDENCE",
      "Project B must remain INSUFFICIENT_EVIDENCE",
    );
    assert(healthBRes.data.top_priorities.length === 0, "Project B must have 0 priorities");
    log(" [✓] Multi-project isolation verified.");

    // 8. Verify Zero Raw Secret Leakage & Section 18 Export
    log("Step 8: Verifying zero raw secret leakage and Section 18 markdown export...");
    assert(
      !healthRes.raw.includes(SECRET_TOKEN),
      `Raw secret token leaked in project health JSON!`,
    );

    const contextRes = await request("GET", `/api/projects/${projAId}/context/export`);
    assert(contextRes.status === 200, "Failed to get project context markdown");
    assert(
      !contextRes.raw.includes(SECRET_TOKEN),
      `Raw secret token leaked in PROJECT_CONTEXT.md!`,
    );
    assert(
      contextRes.raw.includes("## 18. Unified Project Health & Actionable Priorities"),
      "Missing Section 18 in PROJECT_CONTEXT.md",
    );
    log(" [✓] Strict secret redaction and Section 18 markdown export verified.");

    // 9. Verify 100% Deterministic Reconstructibility
    log("Step 9: Verifying 100% deterministic reconstructibility...");
    const refreshRes = await request("POST", `/api/projects/${projAId}/health/refresh`);
    assert(refreshRes.status === 200, "Failed to refresh project health");
    const healthA2 = refreshRes.data;

    assert(
      healthData.overall_health_score === healthA2.overall_health_score,
      `Reconstructed overall score mismatch: ${healthData.overall_health_score} vs ${healthA2.overall_health_score}`,
    );
    assert(
      healthData.grade === healthA2.grade,
      `Reconstructed grade mismatch: ${healthData.grade} vs ${healthA2.grade}`,
    );
    assert(
      healthData.top_priorities.length === healthA2.top_priorities.length,
      "Reconstructed top priorities count mismatch",
    );
    log(" [✓] Deterministic reconstructibility verified.");

    log("\n============================================================");
    log(" [✓] SPRINT 7: UNIFIED PROJECT HEALTH ORCHESTRATOR PASSED 100%");
    log("============================================================\n");
  } finally {
    // Teardown
    log("Step 10: Cleaning up test projects...");
    try {
      if (projAId) {
        await request("POST", "/events", {
          id: crypto.randomUUID(),
          project_root: tempDirA,
          event_type: "OBSERVATION_STOPPED",
          file_path: "src/auth/login.py",
        });
        await request("DELETE", `/api/projects/${projAId}`);
      }
      if (projBId) {
        await request("DELETE", `/api/projects/${projBId}`);
      }
    } catch {
      // Best effort cleanup
    }
    try {
      fs.rmSync(tempDirA, { recursive: true, force: true });
      fs.rmSync(tempDirB, { recursive: true, force: true });
    } catch {
      // Best effort FS cleanup
    }
    log(" [✓] Cleanup completed.");
  }
}

run().catch((err) => {
  console.error("\n[FAIL] Unhandled error during E2E test:", err);
  process.exit(1);
});
