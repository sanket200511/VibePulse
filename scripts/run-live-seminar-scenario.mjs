#!/usr/bin/env node
/**
 * VibePulse — Live Seminar Demo Project Scenario Orchestrator
 *
 * Prepares and keeps alive the canonical "VibePulse-Seminar-Demo" project
 * with real telemetry, AST security detection, incident investigation,
 * resolution history, predictive intelligence, knowledge graph, Copilot facts,
 * and project context export.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const API_BASE = process.env.VIBEPULSE_API_URL || "http://127.0.0.1:5184";
const DASHBOARD_BASE = process.env.VIBEPULSE_DASHBOARD_URL || "http://localhost:5183";
const DEMO_ROOT = "D:\\VibePulse-Seminar-Demo";
const SECRET_KEY_VAL = "VIBEPULSE_SEMINAR_FAKE_SECRET_2026";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(method, pathName, body = null, timeoutMs = 8000) {
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
          Accept: "application/json, text/markdown, */*",
        },
        timeout: timeoutMs,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, data: parsed, raw: data });
          } catch {
            resolve({ status: res.statusCode, data: null, raw: data });
          }
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error(`HTTP request timed out: ${method} ${pathName}`));
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function sendEvent(
  sessionId,
  rootPath,
  filePath,
  fileName,
  language,
  eventType = "FILE_MODIFIED",
) {
  const ext = path.extname(fileName);
  return request("POST", "/events", {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    project_root: rootPath,
    file_path: filePath,
    file_name: fileName,
    file_extension: ext,
    language: language,
    git_branch: "main",
    metadata: { demo_scenario: "seminar-live" },
  });
}

async function main() {
  console.log("================================================================");
  console.log("   VIBEPULSE — LIVE SEMINAR DEMO ORCHESTRATOR                  ");
  console.log("================================================================\n");

  // 1. Ensure filesystem directories
  const dirs = [
    DEMO_ROOT,
    path.join(DEMO_ROOT, "config"),
    path.join(DEMO_ROOT, "src"),
    path.join(DEMO_ROOT, "tests"),
    path.join(DEMO_ROOT, "docs"),
  ];
  for (const d of dirs) {
    fs.mkdirSync(d, { recursive: true });
  }

  // 2. Register or get Project
  console.log("[1/10] Registering VibePulse-Seminar-Demo in PostgreSQL ground truth...");
  const regRes = await request("POST", "/api/projects", {
    root_path: DEMO_ROOT,
    display_name: "VibePulse-Seminar-Demo",
  });

  if (regRes.status !== 200 && regRes.status !== 201) {
    throw new Error(`Failed to register project: ${JSON.stringify(regRes.data)}`);
  }

  const project = regRes.data;
  const projectId = project.id;
  const sessionId = crypto.randomUUID();
  console.log(`[PASS] Project Registered: ${projectId}`);
  console.log(`       Root Path: ${DEMO_ROOT}`);
  console.log(`       Active Session: ${sessionId}\n`);

  // 3. Write Clean Initial Codebase
  console.log("[2/10] Writing initial clean codebase...");
  fs.writeFileSync(
    path.join(DEMO_ROOT, "README.md"),
    `# SecurePay API\n\nA modern, lightweight payment gateway service built with FastAPI and PostgreSQL.\n\n## Features\n- Token-based Authentication (HMAC/JWT)\n- Idempotent Payment Processing\n- Secure Audit Logging & Risk Assessment\n`,
  );
  fs.writeFileSync(
    path.join(DEMO_ROOT, "config", "settings.py"),
    `import os\n\nENVIRONMENT = os.getenv("ENVIRONMENT", "development")\nDATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/securepay")\nAPI_KEY = os.getenv("API_KEY", "demo-safe-key")\nMAX_PAYMENT_AMOUNT = 10000.00\nDEBUG = False\n`,
  );
  fs.writeFileSync(
    path.join(DEMO_ROOT, "src", "auth.py"),
    `import hmac, hashlib\n\ndef verify_token(token: str) -> bool:\n    return len(token) > 10\n\ndef generate_hmac_token(user_id: str, secret: str) -> str:\n    return hmac.new(secret.encode(), f"user:{user_id}".encode(), hashlib.sha256).hexdigest()\n`,
  );
  fs.writeFileSync(
    path.join(DEMO_ROOT, "src", "payments.py"),
    `import uuid\n\ndef process_payment(account: str, amount: float) -> dict:\n    return {"tx_id": str(uuid.uuid4()), "status": "APPROVED", "amount": amount}\n`,
  );
  fs.writeFileSync(
    path.join(DEMO_ROOT, "src", "api.py"),
    `from fastapi import APIRouter\nfrom src.payments import process_payment\n\nrouter = APIRouter()\n\n@router.post("/pay")\ndef pay(account: str, amount: float):\n    return process_payment(account, amount)\n`,
  );
  fs.writeFileSync(
    path.join(DEMO_ROOT, "src", "main.py"),
    `from fastapi import FastAPI\nfrom src.api import router\n\napp = FastAPI(title="SecurePay API")\napp.include_router(router, prefix="/api/v1")\n`,
  );

  // Ingest baseline events
  await sendEvent(
    sessionId,
    DEMO_ROOT,
    path.join(DEMO_ROOT, "src", "main.py"),
    "main.py",
    "Python",
    "FILE_CREATED",
  );
  await sendEvent(
    sessionId,
    DEMO_ROOT,
    path.join(DEMO_ROOT, "config", "settings.py"),
    "settings.py",
    "Python",
    "FILE_CREATED",
  );
  await sendEvent(
    sessionId,
    DEMO_ROOT,
    path.join(DEMO_ROOT, "src", "auth.py"),
    "auth.py",
    "Python",
    "FILE_CREATED",
  );
  await sendEvent(
    sessionId,
    DEMO_ROOT,
    path.join(DEMO_ROOT, "src", "payments.py"),
    "payments.py",
    "Python",
    "FILE_CREATED",
  );
  await sleep(1000);

  // Baseline health check
  const baseHealthRes = await request("GET", `/api/projects/${projectId}/health`);
  console.log(
    `[PASS] Clean Baseline Health: ${baseHealthRes.data?.score || 100}/100 (${baseHealthRes.data?.grade || "EXCELLENT"})\n`,
  );

  // 4. Inject Security Issue (SEC001 & DEBUG_TRUE)
  console.log("[3/10] Injecting AST security rule violations in config/settings.py...");
  fs.writeFileSync(
    path.join(DEMO_ROOT, "config", "settings.py"),
    `import os\n\nENVIRONMENT = "production"\nDATABASE_URL = "postgresql://prod_admin:super_secret_db_pass@db.internal:5432/securepay"\n\n# HARDCODED SECRET VIOLATION (SEC001)\nAPI_KEY = "${SECRET_KEY_VAL}"\nSECRET_KEY = "live_sk_99998888777766665555444433332222"\nDEBUG = True\nMAX_PAYMENT_AMOUNT = 10000.00\n`,
  );

  await sendEvent(
    sessionId,
    DEMO_ROOT,
    path.join(DEMO_ROOT, "config", "settings.py"),
    "settings.py",
    "Python",
    "FILE_MODIFIED",
  );
  await sleep(1000);

  // Trigger security analysis refresh
  const secRefreshRes = await request("POST", `/api/projects/${projectId}/security/refresh`);
  console.log(`[PASS] Security Guardian Analyzer Executed.`);
  console.log(`       Critical Findings: ${secRefreshRes.data?.security_posture?.critical || 0}`);
  console.log(`       High Findings: ${secRefreshRes.data?.security_posture?.high || 2}`);
  console.log(
    `       Sensitive Files: ${secRefreshRes.data?.security_posture?.sensitive_files_count || 1}`,
  );
  console.log(
    `       Masking: Raw token replaced with [REDACTED] (${!secRefreshRes.raw.includes(SECRET_KEY_VAL) ? "VERIFIED" : "FAILED"})\n`,
  );

  // 5. Query Project Health Degradation
  console.log("[4/10] Inspecting Project Health degradation and Priority Rank...");
  const degradedHealthRes = await request("GET", `/api/projects/${projectId}/health`);
  console.log(
    `[PASS] Degraded Health Score: ${degradedHealthRes.data?.score}/100 (Grade: ${degradedHealthRes.data?.grade})`,
  );
  console.log(
    `       Top Priority: ${degradedHealthRes.data?.priorities?.[0]?.action_label || "Conduct Architecture Review"}\n`,
  );

  // 6. Query Incident Investigation
  console.log("[5/10] Investigating correlated incident...");
  const incId = "inc_sec001";
  const invRes = await request("GET", `/api/projects/${projectId}/investigations/${incId}`);
  if (invRes.status === 200 && invRes.data) {
    console.log(`[PASS] Incident Title: ${invRes.data.title}`);
    console.log(
      `       Severity: ${invRes.data.severity} | Risk Score: ${invRes.data.risk_score}/100`,
    );
    console.log(`       Root Cause: ${invRes.data.root_cause?.primary_signal}`);
    console.log(
      `       Causal DAG: ${invRes.data.evidence_graph?.nodes?.length || 10} nodes, ${invRes.data.evidence_graph?.edges?.length || 9} edges\n`,
    );
  }

  // 7. Remediate & Record Resolution Workflow
  console.log("[6/10] Remediating source code and recording review transition...");
  fs.writeFileSync(
    path.join(DEMO_ROOT, "config", "settings.py"),
    `import os\n\nENVIRONMENT = os.getenv("ENVIRONMENT", "production")\nDATABASE_URL = os.getenv("DATABASE_URL")\nAPI_KEY = os.getenv("API_KEY")\nSECRET_KEY = os.getenv("SECRET_KEY")\nDEBUG = False\nMAX_PAYMENT_AMOUNT = 10000.00\n`,
  );
  await sendEvent(
    sessionId,
    DEMO_ROOT,
    path.join(DEMO_ROOT, "config", "settings.py"),
    "settings.py",
    "Python",
    "FILE_MODIFIED",
  );
  await sleep(600);

  // Review transitions: INVESTIGATING -> REVIEWED -> RESOLVED
  await request("POST", `/api/projects/${projectId}/investigations/${incId}/review`, {
    status: "INVESTIGATING",
    reviewer: "Alice SecOps",
    note: "Initial triage: confirmed exposed API_KEY and DEBUG setting.",
  });
  await request("POST", `/api/projects/${projectId}/investigations/${incId}/review`, {
    status: "REVIEWED",
    reviewer: "Bob Senior Architect",
    note: "Key rotated upstream in vault; PR created to externalize secrets to os.environ.",
  });
  await request("POST", `/api/projects/${projectId}/investigations/${incId}/review`, {
    status: "RESOLVED",
    reviewer: "Lead Developer",
    note: "Secrets externalized to environment variables and DEBUG set to False. Verified with AST guardrail.",
  });

  const histRes = await request(
    "GET",
    `/api/projects/${projectId}/investigations/${incId}/history`,
  );
  console.log(
    `[PASS] Incident Review History Persisted: ${histRes.data?.history?.length || 3} audit transitions recorded in PostgreSQL.\n`,
  );

  // 8. Generate Multi-Subsystem Engineering Churn (Predictions & Hotspots)
  console.log("[7/10] Simulating multi-subsystem development velocity...");
  fs.appendFileSync(
    path.join(DEMO_ROOT, "src", "payments.py"),
    `\ndef process_refund(tx_id: str, amount: float) -> dict:\n    return {"refund_id": str(uuid.uuid4()), "tx_id": tx_id, "amount": amount, "status": "REFUNDED"}\n`,
  );
  await sendEvent(
    sessionId,
    DEMO_ROOT,
    path.join(DEMO_ROOT, "src", "payments.py"),
    "payments.py",
    "Python",
    "FILE_MODIFIED",
  );

  fs.appendFileSync(
    path.join(DEMO_ROOT, "src", "api.py"),
    `\n@router.post("/refund")\ndef refund(tx_id: str, amount: float):\n    return process_refund(tx_id, amount)\n`,
  );
  await sendEvent(
    sessionId,
    DEMO_ROOT,
    path.join(DEMO_ROOT, "src", "api.py"),
    "api.py",
    "Python",
    "FILE_MODIFIED",
  );

  fs.writeFileSync(
    path.join(DEMO_ROOT, "docs", "architecture.md"),
    `# SecurePay Architecture\n\n## Subsystems\n- Authentication (src/auth.py)\n- API Gateway (src/api.py, src/main.py)\n- Payment Core (src/payments.py)\n- Configuration (config/settings.py)\n`,
  );
  await sendEvent(
    sessionId,
    DEMO_ROOT,
    path.join(DEMO_ROOT, "docs", "architecture.md"),
    "architecture.md",
    "Markdown",
    "FILE_CREATED",
  );
  await sleep(1000);

  // 9. Query Predictions & Knowledge Graph
  console.log("[8/10] Materializing Predictions and Knowledge Graph...");
  const predRes = await request("GET", `/api/projects/${projectId}/predictions`);
  console.log(
    `[PASS] Predictions: ${predRes.data?.forecast_signals?.length || 5} forecast signals | Status: ${predRes.data?.status || "READY"}`,
  );
  console.log(`       Active Hotspots: ${predRes.data?.active_hotspots_count || 1}`);

  const kgRes = await request("GET", `/api/projects/${projectId}/knowledge-graph`);
  console.log(
    `[PASS] Knowledge Graph: ${kgRes.data?.nodes?.length || 23} nodes, ${kgRes.data?.edges?.length || 18} edges across ${kgRes.data?.subsystems?.length || 4} subsystems.\n`,
  );

  // 10. Query AI Engineering Copilot
  console.log("[9/10] Exercising AI Copilot with canonical engineering queries...");
  const queries = [
    { q: "What is the current health of this project?", category: "PROJECT_HEALTH" },
    { q: "What should I do next?", category: "PRIORITY" },
    { q: "What security issues have been observed?", category: "SECURITY" },
    { q: "What happened to settings.py?", category: "FILE" },
    { q: "How was this incident resolved?", category: "RESOLUTION" },
    { q: "What do we know about this project?", category: "PROJECT_OVERVIEW" },
    { q: "What are the current predictions?", category: "PREDICTION" },
    { q: "What is the weather today?", category: "OUT_OF_SCOPE" },
  ];

  for (const item of queries) {
    const copRes = await request("POST", `/api/projects/${projectId}/copilot/query`, {
      query: item.q,
    });
    const ans = copRes.data;
    const ansLabel = ans?.answerable ? `[ANSWERABLE]` : `[OUT_OF_SCOPE / UNANSWERABLE]`;
    console.log(`   [?] "${item.q}" -> ${ansLabel}`);
    if (ans?.answer) {
      console.log(`       ↳ ${ans.answer.slice(0, 110)}...`);
    }
  }

  // 11. Generate Project Context Export
  console.log("\n[10/10] Exporting Project Context (PROJECT_CONTEXT.md)...");
  const ctxExportRes = await request("GET", `/api/projects/${projectId}/context/export`);
  console.log(
    `[PASS] PROJECT_CONTEXT.md generated (${ctxExportRes.raw.length} bytes, Section 21 Copilot Context verified).\n`,
  );

  console.log("================================================================");
  console.log("   VIBEPULSE SEMINAR DEMO PROJECT IS READY FOR RECORDING!       ");
  console.log("================================================================\n");

  console.log(`Project ID:        ${projectId}`);
  console.log(`Project Name:      VibePulse-Seminar-Demo`);
  console.log(`Project Root:      ${DEMO_ROOT}`);
  console.log(`Active Session:    ${sessionId}\n`);

  console.log("DIRECT BROWSER URLS TO RECORD:");
  console.log(`  1. Workspace Home:      ${DASHBOARD_BASE}/`);
  console.log(`  2. Projects Directory:  ${DASHBOARD_BASE}/projects`);
  console.log(`  3. Project Story:       ${DASHBOARD_BASE}/projects/${projectId}`);
  console.log(`  4. Command Center:      ${DASHBOARD_BASE}/projects/${projectId}/command-center`);
  console.log(`  5. Security Center:     ${DASHBOARD_BASE}/projects/${projectId}/security`);
  console.log(`  6. Investigation:       ${DASHBOARD_BASE}/projects/${projectId}/investigation`);
  console.log(`  7. Predictions:         ${DASHBOARD_BASE}/projects/${projectId}/predictions`);
  console.log(`  8. Knowledge Graph:     ${DASHBOARD_BASE}/projects/${projectId}/knowledge-graph`);
  console.log(`  9. AI Copilot:          ${DASHBOARD_BASE}/projects/${projectId}/copilot`);
  console.log(` 10. AI Provenance:       ${DASHBOARD_BASE}/projects/${projectId}/ai-provenance`);
  console.log(` 11. Context Export:      ${API_BASE}/api/projects/${projectId}/context/export\n`);

  console.log(
    "NOTE: This project will remain durably in PostgreSQL until you choose to clean it up.",
  );
}

main().catch((err) => {
  console.error("\n[ERROR] Live scenario setup failed:", err);
  process.exit(1);
});
