#!/usr/bin/env node
/**
 * VIBEPULSE — LATENCY & PERFORMANCE AUDIT BENCHMARK
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const API_BASE = process.env.VIBEPULSE_API_URL || process.env.API_BASE || "http://127.0.0.1:5184";

async function request(method, pathName, body = null) {
  const url = new URL(pathName, API_BASE);
  const payload = body ? JSON.stringify(body) : null;
  const start = performance.now();

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
          const duration = performance.now() - start;
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, data: parsed, latencyMs: duration });
          } catch {
            resolve({ status: res.statusCode, data, latencyMs: duration });
          }
        });
      },
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function benchmark() {
  console.log("=================================================");
  console.log("   VIBEPULSE PERFORMANCE & LATENCY MEASUREMENTS  ");
  console.log("=================================================");

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vp-bench-"));
  const results = [];

  try {
    // 1. Project Registration
    const r1 = await request("POST", "/api/projects", {
      display_name: "Bench Project",
      root_path: tmpRoot,
    });
    const projectId = r1.data.id;
    results.push({
      operation: "Project Registration (POST /api/projects)",
      latencyMs: r1.latencyMs,
    });

    // 2. Ingest 10 events
    const sessionId = crypto.randomUUID();
    let totalIngestTime = 0;
    for (let i = 0; i < 10; i++) {
      const r = await request("POST", "/events", {
        schema_version: 1,
        event_type: "FILE_MODIFIED",
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        project_root: tmpRoot,
        file_path: `src/module_${i}.py`,
        file_name: `module_${i}.py`,
        file_extension: ".py",
        language: "Python",
        metadata: { diff: `+ # Change ${i}\n+ API_KEY = 'sk_test_123'` },
      });
      totalIngestTime += r.latencyMs;
    }
    results.push({
      operation: "Event Ingestion & AST Analysis (POST /events avg)",
      latencyMs: totalIngestTime / 10,
    });

    // 3. Project Health Calculation
    const r3 = await request("GET", `/api/projects/${projectId}/health`);
    results.push({
      operation: "Unified Health Calculation (GET /api/projects/:id/health)",
      latencyMs: r3.latencyMs,
    });

    // 4. Security Intelligence Projection
    const r4 = await request("GET", `/api/projects/${projectId}/security`);
    results.push({
      operation: "Security Intelligence (GET /api/projects/:id/security)",
      latencyMs: r4.latencyMs,
    });

    // 5. Predictive Intelligence Projection
    const r5 = await request("GET", `/api/projects/${projectId}/predictions`);
    results.push({
      operation: "Predictive Intelligence (GET /api/projects/:id/predictions)",
      latencyMs: r5.latencyMs,
    });

    // 6. Knowledge Graph Materialization
    const r6 = await request("GET", `/api/projects/${projectId}/knowledge-graph`);
    results.push({
      operation: "Knowledge Graph Traversal (GET /api/projects/:id/knowledge-graph)",
      latencyMs: r6.latencyMs,
    });

    // 7. Copilot Query Execution
    const r7 = await request("POST", `/api/projects/${projectId}/copilot/query`, {
      query: "What should I fix first?",
    });
    results.push({
      operation: "Copilot Synthesis (POST /api/projects/:id/copilot/query)",
      latencyMs: r7.latencyMs,
    });

    // 8. PROJECT_CONTEXT.md Markdown Export
    const r8 = await request("GET", `/api/projects/${projectId}/context/export`);
    results.push({
      operation: "Full Context Export (GET /api/projects/:id/context/export)",
      latencyMs: r8.latencyMs,
    });

    console.table(
      results.map((r) => ({
        Operation: r.operation,
        "Latency (ms)": r.latencyMs.toFixed(2) + " ms",
        Status: r.latencyMs < 500 ? "⚡ FAST (<500ms)" : "OK",
      })),
    );
  } finally {
    if (projectId) {
      try {
        await request("DELETE", `/api/projects/${projectId}?force=true`);
      } catch {}
    }
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

benchmark().catch((e) => {
  console.error("Benchmark error:", e);
  process.exit(1);
});
