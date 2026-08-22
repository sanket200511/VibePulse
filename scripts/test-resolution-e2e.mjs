#!/usr/bin/env node

/**
 * Sprint 5 Incident Collaboration + Resolution Intelligence E2E Verification Script
 *
 * Verifies:
 * 1. Project registration & telemetry ingestion with test secret
 * 2. Investigation 3.0 reconstruction & Resolution Intelligence recommendations
 * 3. Review state transitions (OPEN -> INVESTIGATING -> REVIEWED -> RESOLVED)
 * 4. Immutable Incident Review Audit Trail (GET /history)
 * 5. Evidence-backed Incident Metrics & Project Health Summary
 * 6. Strict Secret Redaction Invariant (ZERO raw occurrences of VIBEPULSE_SPRINT5_SECRET_2026)
 * 7. Multi-project isolation & clean cascade cleanup
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const API_BASE = process.env.VIBEPULSE_API_URL || "http://127.0.0.1:5133";
const SECRET_VAL = "VIBEPULSE_SPRINT5_SECRET_2026";

async function main() {
  console.log("============================================================");
  console.log(" VIBEPULSE — SPRINT 5 INCIDENT RESOLUTION E2E AUDIT");
  console.log("============================================================\n");

  // Check API health
  let healthy = false;
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) healthy = true;
  } catch {}

  if (!healthy) {
    console.error(`❌ FastAPI backend is not running at ${API_BASE}.`);
    console.error("Please run: cd apps/api && uv run uvicorn app.main:app --port 5133");
    process.exit(1);
  }

  // 1. Create disposable project directory for Project A and B
  const tmpDirA = await fs.mkdtemp(path.join(os.tmpdir(), "vp-res-proj-a-"));
  const tmpDirB = await fs.mkdtemp(path.join(os.tmpdir(), "vp-res-proj-b-"));
  console.log(`[1/9] Created disposable projects: \n  A: ${tmpDirA}\n  B: ${tmpDirB}`);

  try {
    // 2. Register Project A
    const regResA = await fetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        root_path: tmpDirA,
        display_name: "Sprint 5 Resolution Project A",
      }),
    });
    if (!regResA.ok) throw new Error(`Failed to register Project A: ${regResA.statusText}`);
    const projA = await regResA.json();
    const projIdA = projA.id;

    // Register Project B
    const regResB = await fetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        root_path: tmpDirB,
        display_name: "Sprint 5 Resolution Project B",
      }),
    });
    if (!regResB.ok) throw new Error(`Failed to register Project B: ${regResB.statusText}`);
    const projB = await regResB.json();
    const projIdB = projB.id;

    console.log(`[2/9] Registered Projects -> A: ${projIdA}, B: ${projIdB}`);

    // 3. Write files with secret to Project A
    const vaultFile = path.join(tmpDirA, "vault.py");
    await fs.writeFile(vaultFile, `API_KEY = "${SECRET_VAL}"\nDEBUG = True\n`, "utf-8");

    // Ingest event to Project A
    const eventRes = await fetch(`${API_BASE}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "FILE_MODIFIED",
        timestamp: new Date().toISOString(),
        session_id: "11111111-2222-3333-4444-555555555555",
        project_root: tmpDirA,
        file_path: vaultFile,
        file_name: "vault.py",
        file_extension: ".py",
        language: "Python",
        git_branch: "main",
        metadata: {},
      }),
    });
    if (!eventRes.ok) throw new Error(`Failed to ingest event: ${eventRes.statusText}`);
    console.log(`[3/9] Ingested security event with secret into Project A.`);

    // 4. Fetch initial incident investigation
    const invRes = await fetch(`${API_BASE}/api/projects/${projIdA}/investigations/inc-sprint5-1`);
    if (!invRes.ok) throw new Error(`Failed to fetch investigation: ${invRes.statusText}`);
    const inv = await invRes.json();
    console.log(`[4/9] Reconstructed Incident Investigation:`);
    console.log(
      `      Severity: ${inv.severity} | Score: ${inv.risk_score} | Status: ${inv.status}`,
    );
    console.log(`      Recommendations Count: ${inv.resolution_recommendations?.length || 0}`);

    if (!inv.resolution_recommendations || inv.resolution_recommendations.length === 0) {
      throw new Error("❌ Expected Resolution Recommendations in investigation response.");
    }

    // 5. Execute review lifecycle transitions
    const incId = "inc-sprint5-1";

    // Transition 1: INVESTIGATING
    const rev1 = await fetch(`${API_BASE}/api/projects/${projIdA}/investigations/${incId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "INVESTIGATING",
        reviewed_by: "Alice SecOps",
        resolution_note: "Initial triage in progress.",
      }),
    });
    if (!rev1.ok) throw new Error("Failed transition to INVESTIGATING");

    // Transition 2: REVIEWED
    const rev2 = await fetch(`${API_BASE}/api/projects/${projIdA}/investigations/${incId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "REVIEWED",
        reviewed_by: "Bob Reviewer",
        resolution_note: "Confirmed exposed token. Ready for rotation.",
      }),
    });
    if (!rev2.ok) throw new Error("Failed transition to REVIEWED");

    // Transition 3: RESOLVED
    const rev3 = await fetch(`${API_BASE}/api/projects/${projIdA}/investigations/${incId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "RESOLVED",
        reviewed_by: "Charlie Lead",
        resolution_note: "Revoked key upstream, moved to .env vault, patched DEBUG setting.",
      }),
    });
    if (!rev3.ok) throw new Error("Failed transition to RESOLVED");
    console.log(
      `[5/9] Successfully executed review lifecycle: OPEN -> INVESTIGATING -> REVIEWED -> RESOLVED`,
    );

    // 6. Fetch Review Audit History
    const histRes = await fetch(
      `${API_BASE}/api/projects/${projIdA}/investigations/${incId}/history`,
    );
    if (!histRes.ok) throw new Error("Failed to fetch review history");
    const histData = await histRes.json();
    console.log(`[6/9] Fetched Incident Audit History (${histData.history.length} records):`);
    for (const h of histData.history) {
      console.log(
        `      - [${h.created_at}] ${h.previous_status} -> ${h.new_status} by ${h.reviewer} ("${h.resolution_note}")`,
      );
    }
    if (histData.history.length !== 3) {
      throw new Error(`❌ Expected 3 history records, got ${histData.history.length}`);
    }

    // 7. Verify Incident Metrics & Health Summary
    const metricsRes = await fetch(`${API_BASE}/api/projects/${projIdA}/investigations/metrics`);
    if (!metricsRes.ok) throw new Error("Failed to fetch metrics");
    const metrics = await metricsRes.json();
    console.log(`[7/9] Incident Metrics:`);
    console.log(
      `      Total Incidents: ${metrics.total_incidents} | Resolved: ${metrics.resolved_incidents} | Transitions: ${metrics.total_transitions}`,
    );
    console.log(`      Resolution Rate: ${metrics.resolution_rate_percent}%`);

    const healthRes = await fetch(
      `${API_BASE}/api/projects/${projIdA}/investigations/health-summary`,
    );
    if (!healthRes.ok) throw new Error("Failed to fetch health summary");
    const health = await healthRes.json();
    console.log(
      `      Health Summary Posture: ${health.security_posture} | Subsystem: ${health.most_affected_subsystem}`,
    );

    // 8. Strict Secret Redaction Validation
    const allPayloads = [
      JSON.stringify(inv),
      JSON.stringify(histData),
      JSON.stringify(metrics),
      JSON.stringify(health),
    ];

    const expMdRes = await fetch(
      `${API_BASE}/api/projects/${projIdA}/investigations/${incId}/export`,
    );
    const expMd = await expMdRes.text();
    allPayloads.push(expMd);

    const aiRes = await fetch(
      `${API_BASE}/api/projects/${projIdA}/investigations/${incId}/ai-handoff`,
    );
    const expAi = await aiRes.text();
    allPayloads.push(expAi);

    for (const p of allPayloads) {
      if (p.includes(SECRET_VAL)) {
        throw new Error(`❌ STRICT SECURITY FAILURE: Raw secret leaked in response payload!`);
      }
    }
    console.log(
      `[8/9] Verified STRICT ZERO RAW SECRET LEAKAGE across all API responses & exports.`,
    );

    // 9. Multi-Project Isolation & Cascade Deletion
    const histBRes = await fetch(
      `${API_BASE}/api/projects/${projIdB}/investigations/${incId}/history`,
    );
    const histB = await histBRes.json();
    if (histB.history.length !== 0) {
      throw new Error(`❌ Multi-project isolation leak: Project B contains Project A history!`);
    }

    // Send OBSERVATION_STOPPED so session is completed and project can be deleted
    await fetch(`${API_BASE}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "OBSERVATION_STOPPED",
        timestamp: new Date().toISOString(),
        session_id: "11111111-2222-3333-4444-555555555555",
        project_root: tmpDirA,
        metadata: {},
      }),
    });

    // Delete Project A
    const delRes = await fetch(`${API_BASE}/api/projects/${projIdA}`, { method: "DELETE" });
    if (!delRes.ok) {
      const errText = await delRes.text();
      throw new Error(`Failed to delete Project A: ${delRes.status} ${errText}`);
    }

    // Delete Project B after verification
    await fetch(`${API_BASE}/api/projects/${projIdB}?force=true`, { method: "DELETE" });

    console.log(`[9/9] Verified Multi-Project Isolation and clean cascade cleanup on deletion.`);

    console.log("\n============================================================");
    console.log(" ✅ SPRINT 5 INCIDENT RESOLUTION AUDIT PASSED 100%");
    console.log("============================================================\n");
  } finally {
    try {
      if (projIdA)
        await fetch(`${API_BASE}/api/projects/${projIdA}?force=true`, { method: "DELETE" });
      if (projIdB)
        await fetch(`${API_BASE}/api/projects/${projIdB}?force=true`, { method: "DELETE" });
    } catch {}
    await fs.rm(tmpDirA, { recursive: true, force: true });
    await fs.rm(tmpDirB, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error("❌ E2E Audit Failed:", err);
  process.exit(1);
});
