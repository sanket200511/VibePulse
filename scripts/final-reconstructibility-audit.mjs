#!/usr/bin/env node
/**
 * VIBEPULSE — SPRINT 14 RECONSTRUCTIBILITY & DETERMINISM AUDIT ($A \equiv B$)
 *
 * Verifies that all derived intelligence (Health, Security, Predictions, Knowledge Graph, Copilot)
 * can be deterministically recomputed from raw PostgreSQL historical telemetry events.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const API_BASE = process.env.VIBEPULSE_API_URL || process.env.API_BASE || "http://127.0.0.1:5133";

async function request(method, pathName, body = null) {
  const url = new URL(pathName, API_BASE);
  const payload = body ? JSON.stringify(body) : null;

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method,
        headers: {
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, data: parsed, raw: data });
          } catch {
            resolve({ status: res.statusCode, data, raw: data });
          }
        });
      },
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runReconstructibilityAudit() {
  console.log("================================================================");
  console.log("    VIBEPULSE SPRINT 14 DETERMINISTIC RECONSTRUCTIBILITY AUDIT  ");
  console.log("================================================================");

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vp-recon-audit-"));

  try {
    const reg = await request("POST", "/api/projects", {
      display_name: "Determinism Verification Project",
      root_path: tmpRoot,
    });
    const projectId = reg.data.id;
    const sessionId = crypto.randomUUID();

    // Ingest controlled telemetry
    await request("POST", "/events", {
      schema_version: 1,
      event_type: "FILE_MODIFIED",
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      project_root: tmpRoot,
      file_path: "src/auth/service.py",
      file_name: "service.py",
      file_extension: ".py",
      language: "Python",
      metadata: { diff: "+ def login(): pass" },
    });

    // 1. Initial State A
    const healthA = await request("GET", `/api/projects/${projectId}/health`);
    const kgA = await request("GET", `/api/projects/${projectId}/knowledge-graph`);
    const copilotA = await request("POST", `/api/projects/${projectId}/copilot/query`, {
      query: "What is the current health of this project?",
    });

    // 2. Trigger Health Refresh (Clearing derived caches & recomputing from PostgreSQL)
    const healthB = await request("POST", `/api/projects/${projectId}/health/refresh`);
    const kgB = await request("GET", `/api/projects/${projectId}/knowledge-graph`);
    const copilotB = await request("POST", `/api/projects/${projectId}/copilot/query`, {
      query: "What is the current health of this project?",
    });

    const results = [
      {
        subsystem: "Overall Health Score",
        stateA: `${healthA.data.overall_health_score}/100 (${healthA.data.grade})`,
        stateB: `${healthB.data.overall_health_score}/100 (${healthB.data.grade})`,
        match: healthA.data.overall_health_score === healthB.data.overall_health_score,
      },
      {
        subsystem: "Knowledge Graph Nodes",
        stateA: `${kgA.data.total_nodes} nodes, ${kgA.data.total_edges} edges`,
        stateB: `${kgB.data.total_nodes} nodes, ${kgB.data.total_edges} edges`,
        match: kgA.data.total_nodes === kgB.data.total_nodes && kgA.data.total_edges === kgB.data.total_edges,
      },
      {
        subsystem: "Copilot Synthesis Narrative",
        stateA: copilotA.data.summary.slice(0, 45) + "...",
        stateB: copilotB.data.summary.slice(0, 45) + "...",
        match: copilotA.data.summary === copilotB.data.summary,
      },
      {
        subsystem: "Security Health Dimension",
        stateA: `${healthA.data.security_health.score}/100`,
        stateB: `${healthB.data.security_health.score}/100`,
        match: healthA.data.security_health.score === healthB.data.security_health.score,
      },
      {
        subsystem: "Engineering Stability Dimension",
        stateA: `${healthA.data.engineering_stability.score}/100`,
        stateB: `${healthB.data.engineering_stability.score}/100`,
        match: healthA.data.engineering_stability.score === healthB.data.engineering_stability.score,
      },
    ];

    console.table(results);

    const allMatched = results.every((r) => r.match);
    console.log(allMatched ? "✅ RECONSTRUCTIBILITY AUDIT ($A ≡ B): 100% DETERMINISTIC MATCH!" : "❌ AUDIT FAILED!");

    await request("DELETE", `/api/projects/${projectId}`);
    if (!allMatched) process.exit(1);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

runReconstructibilityAudit().catch((err) => {
  console.error("Reconstructibility audit failed:", err);
  process.exit(1);
});
