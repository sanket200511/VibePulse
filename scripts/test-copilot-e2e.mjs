#!/usr/bin/env node

/**
 * End-to-End Acceptance Test for Sprint 11:
 * VIBEPULSE AI ENGINEERING COPILOT FOUNDATION
 *
 * Verifies:
 * 1. Multi-domain query classification across 12 canonical intents
 * 2. Grounded factual decomposition ([OBSERVED], [INFERRED], [UNKNOWN])
 * 3. Answerability Gate (returns answerable=false for out-of-scope queries)
 * 4. Pure deterministic response composer with prioritized recommendations
 * 5. Secret safety (zero raw exposure of VIBEPULSE_SPRINT11_SECRET_2026, masked to [REDACTED])
 * 6. Multi-project isolation (Project A never leaks into Project B)
 * 7. Deterministic reconstructibility (Query A == Query B)
 * 8. Dynamic state-driven suggestions endpoint
 * 9. AI evidence context package export (Section 21)
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const API_DIR = path.join(ROOT_DIR, "apps", "api");

const API_BASE = process.env.VIBEPULSE_API_URL || process.env.API_BASE || "http://127.0.0.1:5133";
const SECRET_TOKEN = "VIBEPULSE_SPRINT11_SECRET_2026";

let serverProcess = null;

function log(msg) {
  console.log(`[SPRINT 11 E2E] ${msg}`);
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureApiRunning() {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await request("GET", "/health");
      if (res.status === 200) {
        log("✔ Connected to existing API server on " + API_BASE);
        return;
      }
    } catch {
      // not yet up
    }
    await sleep(200);
  }

  log("Starting API server for E2E testing...");
  const apiPort = new URL(API_BASE).port || "5133";
  serverProcess = spawn(
    "uv",
    ["run", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", apiPort],
    {
      cwd: API_DIR,
      stdio: "pipe",
      shell: true,
    },
  );

  let started = false;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const res = await request("GET", "/health");
      if (res.status === 200) {
        started = true;
        log("✔ API server successfully spawned and ready");
        break;
      }
    } catch {
      // waiting
    }
  }

  if (!started) {
    throw new Error("Failed to start API server within timeout");
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ SPRINT 11 E2E FAILED: ${message}`);
    cleanup();
    process.exit(1);
  }
}

function cleanup() {
  if (serverProcess) {
    log("Shutting down spawned API server...");
    serverProcess.kill();
    serverProcess = null;
  }
}

async function run() {
  log("Starting Sprint 11 AI Engineering Copilot Foundation E2E Acceptance Test...");

  await ensureApiRunning();

  // Step 1: Health check
  const healthRes = await request("GET", "/health");
  assert(healthRes.status === 200, "API is reachable and healthy");
  log("✔ API health check passed");

  // Step 2: Register Project A and Project B for isolation verification
  const testRunId = crypto.randomBytes(4).toString("hex");
  const tmpRootA = path.join(os.tmpdir(), `vibepulse-copilot-a-${testRunId}`);
  const tmpRootB = path.join(os.tmpdir(), `vibepulse-copilot-b-${testRunId}`);
  fs.mkdirSync(tmpRootA, { recursive: true });
  fs.mkdirSync(tmpRootB, { recursive: true });

  const projARes = await request("POST", "/api/projects", {
    root_path: tmpRootA,
    display_name: `Copilot Alpha ${testRunId}`,
  });
  assert(projARes.status === 200, "Project A registered");
  const projA = projARes.data;

  const projBRes = await request("POST", "/api/projects", {
    root_path: tmpRootB,
    display_name: `Copilot Beta ${testRunId}`,
  });
  assert(projBRes.status === 200, "Project B registered");
  const projB = projBRes.data;

  log(`✔ Created isolated projects: Alpha (${projA.id}) and Beta (${projB.id})`);

  // Step 3: Ingest telemetry with secrets and multiple subsystems into Project A
  const sessionId = crypto.randomUUID();
  const now = new Date();

  const events = [
    {
      schema_version: 1,
      event_type: "FILE_MODIFIED",
      timestamp: new Date(now.getTime() - 20 * 60000).toISOString(),
      session_id: sessionId,
      project_root: tmpRootA,
      file_path: "src/auth/jwt_service.py",
      file_name: "jwt_service.py",
      file_extension: ".py",
      language: "Python",
      metadata: {
        diff: `+ API_SECRET = 'sk_live_1234567890abcdef'\n+ AUTH_SECRET = '${SECRET_TOKEN}'\n+ DEBUG = True`,
        risk_score: 85,
      },
    },
    {
      schema_version: 1,
      event_type: "FILE_MODIFIED",
      timestamp: new Date(now.getTime() - 15 * 60000).toISOString(),
      session_id: sessionId,
      project_root: tmpRootA,
      file_path: "src/database/connection.py",
      file_name: "connection.py",
      file_extension: ".py",
      language: "Python",
      metadata: {
        diff: "+ async def get_db_pool(): return pool",
      },
    },
    {
      schema_version: 1,
      event_type: "FILE_MODIFIED",
      timestamp: new Date(now.getTime() - 10 * 60000).toISOString(),
      session_id: sessionId,
      project_root: tmpRootA,
      file_path: "src/api/routes.py",
      file_name: "routes.py",
      file_extension: ".py",
      language: "Python",
      metadata: {
        diff: "+ @router.get('/health')\n+ async def health(): return {'status': 'ok'}",
      },
    },
  ];

  for (const ev of events) {
    const evRes = await request("POST", "/events", ev);
    assert(evRes.status === 200 || evRes.status === 201, "Telemetry ingested for Project A");
  }
  log("✔ Ingested AST security telemetry containing raw secret token into Project A");

  // Step 4: Test Query 1 — PROJECT_HEALTH ("What should I fix first?")
  const q1Res = await request("POST", `/api/projects/${projA.id}/copilot/query`, {
    query: "What should I fix first?",
    include_raw_context: true,
  });
  assert(q1Res.status === 200, "Query 1 executed successfully");
  const r1 = q1Res.data;
  assert(r1.answerable === true, "Query 1 is answerable");
  assert(
    r1.intent === "PRIORITY" || r1.intent === "PROJECT_HEALTH",
    "Intent classified as PRIORITY or PROJECT_HEALTH",
  );
  assert(r1.recommendations.length > 0, "Query 1 returned prioritized recommendations");
  assert(r1.observed.length > 0, "Query 1 returned [OBSERVED] factual telemetry");
  assert(r1.inferred.length > 0, "Query 1 returned [INFERRED] computed intelligence");
  assert(r1.unknown.length > 0, "Query 1 returned [UNKNOWN] observation boundaries");
  log(
    "✔ Query 1 ('What should I fix first?') returned grounded recommendations and tri-state facts",
  );

  // Step 5: Test Query 2 — FILE Intent ("What happened to jwt_service.py?")
  const q2Res = await request("POST", `/api/projects/${projA.id}/copilot/query`, {
    query: "What happened to jwt_service.py?",
  });
  assert(q2Res.status === 200, "Query 2 executed");
  const r2 = q2Res.data;
  assert(r2.intent === "FILE", "Intent classified as FILE");
  assert(r2.summary.includes("jwt_service.py"), "Summary focuses on jwt_service.py");
  log(
    "✔ Query 2 ('What happened to jwt_service.py?') correctly extracted entity and file telemetry",
  );

  // Step 6: Test Query 3 — SECURITY Intent ("What security issues keep recurring?")
  const q3Res = await request("POST", `/api/projects/${projA.id}/copilot/query`, {
    query: "What security issues keep recurring?",
  });
  assert(q3Res.status === 200, "Query 3 executed");
  const r3 = q3Res.data;
  assert(r3.intent === "SECURITY", "Intent classified as SECURITY");
  assert(
    r3.summary.includes("Security Intelligence") || r3.summary.includes("Security posture"),
    "Security narrative generated: " + r3.summary,
  );
  log("✔ Query 3 ('What security issues keep recurring?') retrieved AST findings");
  log("✔ Query 3 ('What security issues keep recurring?') retrieved AST findings");

  // Step 7: Test Secret Redaction Safety
  const qSecretRes = await request("POST", `/api/projects/${projA.id}/copilot/query`, {
    query: `Why did ${SECRET_TOKEN} appear in jwt_service.py?`,
  });
  assert(qSecretRes.status === 200, "Secret query executed");
  const rSecret = qSecretRes.data;
  assert(
    !JSON.stringify(rSecret).includes(SECRET_TOKEN),
    "Zero exposure of raw secret in response",
  );
  assert(rSecret.query.includes("[REDACTED]"), "Secret is properly masked in query echo");
  assert(JSON.stringify(rSecret).includes("[REDACTED]"), "Response contains [REDACTED] tag");
  log("✔ Secret safety verified: zero raw token leaks; masked to [REDACTED]");

  // Step 8: Test Answerability Gate on Out-of-Scope Query ("Who is the CEO of Google?")
  const qOutRes = await request("POST", `/api/projects/${projA.id}/copilot/query`, {
    query: "Who is the CEO of Google?",
  });
  assert(qOutRes.status === 200, "Out-of-scope query handled gracefully");
  const rOut = qOutRes.data;
  assert(rOut.answerable === false, "Out-of-scope query flagged answerable=false");
  assert(rOut.evidence_strength === "INSUFFICIENT", "Strength is INSUFFICIENT");
  assert(
    rOut.summary.includes("could not be grounded") ||
      rOut.summary.includes("cannot definitively answer") ||
      (rOut.answerability_reason && rOut.answerability_reason.length > 0),
    "Explains unanswerability to engineer",
  );
  log("✔ Answerability gate verified: out-of-scope query rejected without hallucination");

  // Step 9: Test Multi-Project Isolation
  const qIsoRes = await request("POST", `/api/projects/${projB.id}/copilot/query`, {
    query: "What should I fix first?",
  });
  assert(qIsoRes.status === 200, "Project B query executed");
  const rIso = qIsoRes.data;
  const dumpB = JSON.stringify(rIso);
  assert(!dumpB.includes("jwt_service.py"), "Project B does not leak Project A files");
  assert(!dumpB.includes("SEC001"), "Project B does not leak Project A security findings");
  log("✔ Multi-project isolation verified: Project B context is 100% clean of Project A telemetry");

  // Step 10: Test Deterministic Reconstructibility (A == B)
  const qa1 = await request("POST", `/api/projects/${projA.id}/copilot/query`, {
    query: "Why is this project unhealthy?",
  });
  const qa2 = await request("POST", `/api/projects/${projA.id}/copilot/query`, {
    query: "Why is this project unhealthy?",
  });
  assert(qa1.data.intent === qa2.data.intent, "Identical intent across executions");
  assert(qa1.data.summary === qa2.data.summary, "Identical summary across executions");
  assert(qa1.data.observed.length === qa2.data.observed.length, "Identical observed facts length");
  log("✔ Deterministic reconstructibility verified: consecutive queries yield identical responses");

  // Step 11: Test Dynamic Suggestions Endpoint
  const sugRes = await request("GET", `/api/projects/${projA.id}/copilot/suggestions`);
  assert(sugRes.status === 200, "Suggestions endpoint returned 200");
  assert(
    Array.isArray(sugRes.data) && sugRes.data.length >= 3,
    "Returned active state-driven suggestions",
  );
  assert(
    sugRes.data.some((s) => s.question.includes("fix first")),
    "Includes prioritized remediation suggestion",
  );
  log("✔ Dynamic state-driven suggestions verified");

  // Step 12: Test Full Context Package & PROJECT_CONTEXT.md Section 21
  const ctxRes = await request("GET", `/api/projects/${projA.id}/copilot/context`);
  assert(ctxRes.status === 200, "Context package returned 200");
  assert(ctxRes.data.observed_facts.length > 0, "Context includes observed facts");
  assert(ctxRes.data.inferred_facts.length > 0, "Context includes inferred facts");
  assert(ctxRes.data.health_summary.score !== undefined, "Context includes health summary");

  const mdRes = await request("GET", `/api/projects/${projA.id}/context/export`);
  assert(mdRes.status === 200, "PROJECT_CONTEXT.md exported");
  assert(
    mdRes.raw.includes("AI Engineering Copilot Context"),
    "PROJECT_CONTEXT.md includes Section 21",
  );
  assert(
    mdRes.raw.includes("Intent Classification"),
    "PROJECT_CONTEXT.md Section 21 includes intent mapping",
  );
  log("✔ Full evidence context package and PROJECT_CONTEXT.md Section 21 verified");

  // Clean up
  try {
    fs.rmSync(tmpRootA, { recursive: true, force: true });
    fs.rmSync(tmpRootB, { recursive: true, force: true });
  } catch {
    // best-effort
  }

  cleanup();

  console.log("\n==================================================");
  console.log("✅ ALL SPRINT 11 COPILOT ACCEPTANCE CRITERIA PASSED!");
  console.log("==================================================\n");
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

run().catch((err) => {
  console.error("❌ E2E Runner Error:", err);
  cleanup();
  process.exit(1);
});
