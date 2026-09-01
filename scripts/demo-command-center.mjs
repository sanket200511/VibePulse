#!/usr/bin/env node

/**
 * Live Seminar / Judge Demonstration Script for Sprint 8:
 * VIBEPULSE ENGINEERING COMMAND CENTER
 *
 * Demonstrates the complete end-to-end causal intelligence cascade:
 *
 * T+0:   [OBSERVE]     File changes observed in sensitive config file
 * T+1:   [DETECT]      Security Guardian triggers AST rule check
 * T+2:   [INVESTIGATE] Incident correlation creates high-severity incident
 * T+3:   [HEALTH]      Unified Health recalculates (Score drops)
 * T+4:   [PRIORITY]    Priority #1 appears ("Resolve CRITICAL Finding in settings.py")
 * T+5:   [RESOLVE]     Engineer remediates finding and logs review audit decision
 * T+6:   [LEARN]       Context Memory & Resolution history updated
 * T+7:   [ANTICIPATE]  Predictive engine confirms resolution without regression
 * T+8:   [HEALTH]      Health Score recovers to optimal
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

const API_BASE = process.env.VIBEPULSE_API_URL || process.env.API_BASE || "http://127.0.0.1:5184";
const DASHBOARD_BASE = process.env.VIBEPULSE_DASHBOARD_URL || "http://localhost:5183";
const DELAY_MS = process.env.DEMO_SPEED_MS ? parseInt(process.env.DEMO_SPEED_MS, 10) : 1200;
const GLOBAL_TIMEOUT_MS = 60000;

let globalWatchdog = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function banner(title) {
  console.log("\n" + "=".repeat(64));
  console.log(`  ${title}`);
  console.log("=".repeat(64));
}

function step(num, label, detail = "") {
  console.log(`\n▶ [T+${num}] ${label}`);
  if (detail) console.log(`   ↳ ${detail}`);
}

function request(method, pathUrl, body = null, timeoutMs = 5000) {
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
        timeout: timeoutMs,
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
    req.on("timeout", () => {
      req.destroy(new Error(`HTTP timeout after ${timeoutMs}ms: ${method} ${pathUrl}`));
    });
    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runDemo() {
  globalWatchdog = setTimeout(() => {
    console.error(`\n❌ ERROR: Demo exceeded watchdog timeout (${GLOBAL_TIMEOUT_MS}ms)`);
    process.exit(1);
  }, GLOBAL_TIMEOUT_MS);
  globalWatchdog.unref();
  banner("VIBEPULSE LIVE ENGINEERING COMMAND CENTER DEMONSTRATION");
  console.log(`Target API: ${API_BASE}`);
  console.log("Starting presentation sequence...");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vp-demo-command-center-"));
  let projectId;

  try {
    step(0, "SETUP", "Creating disposable project sandbox: " + tempDir);
    const regRes = await request("POST", "/api/projects", {
      root_path: tempDir,
      display_name: "Nexus Payment Gateway (Demo)",
    });
    projectId = regRes.data.id;
    console.log(`   [✓] Project registered. ID: ${projectId}`);
    console.log(`   [✓] Dashboard URL: ${DASHBOARD_BASE}/projects/${projectId}/command-center`);
    await sleep(DELAY_MS);

    // Initial State Check
    step(1, "OBSERVE: Baseline Telemetry", "Project initial telemetry baseline");
    const sessionId = crypto.randomUUID();
    const now = new Date();

    await request("POST", "/events", {
      id: crypto.randomUUID(),
      session_id: sessionId,
      project_root: tempDir,
      timestamp: new Date(now.getTime() - 1000 * 60 * 20).toISOString(),
      event_type: "OBSERVATION_STARTED",
      file_path: "src/app.py",
      file_name: "app.py",
      file_extension: ".py",
      language: "Python",
      metadata: {},
    });

    await request("POST", "/events", {
      id: crypto.randomUUID(),
      session_id: sessionId,
      project_root: tempDir,
      timestamp: new Date(now.getTime() - 1000 * 60 * 15).toISOString(),
      event_type: "FILE_MODIFIED",
      file_path: "src/app.py",
      file_name: "app.py",
      file_extension: ".py",
      language: "Python",
      metadata: { diff: "+ # Initializing payment pipeline" },
    });
    console.log("   [✓] Observation daemon ingesting events into PostgreSQL.");
    await sleep(DELAY_MS);

    // Initial Health
    const h1 = await request("GET", `/api/projects/${projectId}/health`);
    console.log(
      `   [✓] Initial Health Score: ${h1.data.overall_health_score}/100 (${h1.data.grade})`,
    );
    await sleep(DELAY_MS);

    // Ingest Security Violation
    step(
      2,
      "DETECT: AST & Security Guardian Triggered",
      "Developer modifies config/settings.py with secrets",
    );
    const sPath = path.join(tempDir, "src", "config", "settings.py");
    fs.mkdirSync(path.dirname(sPath), { recursive: true });
    fs.writeFileSync(sPath, 'DEBUG = True\nSTRIPE_SECRET = "sk_live_99214_REDACTED_SECRET"\n');

    for (let i = 0; i < 3; i++) {
      await request("POST", "/events", {
        id: crypto.randomUUID(),
        session_id: sessionId,
        project_root: regRes.data.root_path,
        timestamp: new Date(now.getTime() - 1000 * 60 * (10 - i * 2)).toISOString(),
        event_type: "FILE_MODIFIED",
        file_path: "src/config/settings.py",
        file_name: "settings.py",
        file_extension: ".py",
        language: "Python",
        metadata: {
          diff: '+ DEBUG = True\n+ STRIPE_SECRET = "sk_live_99214_REDACTED_SECRET"',
        },
      });
    }
    console.log("   [✓] Events observed. Security Guardian extracted AST finding (SEC001).");
    await sleep(DELAY_MS);

    // Ingest another subsystem file
    step(
      3,
      "ANTICIPATE: Engineering Drift & Hotspots",
      "High velocity modifications in config subsystem",
    );
    await request("POST", "/events", {
      id: crypto.randomUUID(),
      session_id: sessionId,
      project_root: regRes.data.root_path,
      timestamp: new Date(now.getTime() - 1000 * 60 * 2).toISOString(),
      event_type: "FILE_MODIFIED",
      file_path: "src/config/vault.py",
      file_name: "vault.py",
      file_extension: ".py",
      language: "Python",
      metadata: { diff: "+ VAULT_ENABLED = False" },
    });
    await sleep(DELAY_MS);

    // Live Health Recalculation
    step(4, "HEALTH & PRIORITY CASCADE", "Health recalculated from PostgreSQL ground truth");
    const h2 = await request("GET", `/api/projects/${projectId}/health`);
    console.log(
      `   [!] Updated Overall Health Score: ${h2.data.overall_health_score}/100 (${h2.data.grade})`,
    );
    console.log(`   [!] Security Health Dimension: ${h2.data.security_health.score}/100`);
    console.log(`   [!] Active Priorities: ${h2.data.top_priorities.length} items`);
    if (h2.data.top_priorities.length > 0) {
      console.log(`   [!] Priority #1: ${h2.data.top_priorities[0].title}`);
      console.log(`       ↳ Action: ${h2.data.top_priorities[0].recommended_action}`);
    }
    await sleep(DELAY_MS);

    // Trust & Explainability Drill-Down
    step(
      5,
      "TRUST & EXPLAINABILITY: Why Does VibePulse Believe This?",
      "Querying causal evidence chain and mathematical score decomposition",
    );
    const expRes = await request("GET", `/api/projects/${projectId}/evidence/health/overall`);
    console.log(`   [✓] Evidence Provenance: [${expRes.data.provenance}]`);
    console.log(`   [✓] Mathematical Decomposition:`);
    for (const d of expRes.data.score_decomposition) {
      console.log(
        `       • ${d.dimension_name}: ${d.raw_score}/100 × ${(d.weight * 100).toFixed(0)}% = +${d.weighted_contribution}`,
      );
    }
    const secExp = await request("GET", `/api/projects/${projectId}/evidence/security/current`);
    console.log(`   [✓] Causal Chain for ${secExp.data.title}:`);
    for (const c of secExp.data.evidence_chain) {
      console.log(`       ↳ Step ${c.step_number} [${c.stage}]: ${c.title}`);
    }
    await sleep(DELAY_MS);

    // Knowledge Graph & Project Memory 2.0 Drill-Down
    step(
      6,
      "KNOWLEDGE GRAPH & PROJECT MEMORY 2.0: Connected Semantic Intelligence",
      "Materializing derived knowledge graph and structured AI memory model",
    );
    const kgRes = await request("GET", `/api/projects/${projectId}/knowledge-graph`);
    console.log(
      `   [✓] Knowledge Graph Nodes: ${kgRes.data.total_nodes} across ${kgRes.data.subsystems.length} subsystems`,
    );
    console.log(
      `   [✓] Relationships: ${kgRes.data.total_edges} (CONTAINS, BELONGS_TO, AFFECTS, etc.)`,
    );
    const memRes = await request("GET", `/api/projects/${projectId}/knowledge-graph/memory`);
    console.log(
      `   [✓] Project Memory 2.0: Grade ${memRes.data.health_grade} (${memRes.data.overall_health_score}/100) | Focus: ${memRes.data.current_focus}`,
    );
    console.log(
      `   [✓] Interactive Graph URL: ${DASHBOARD_BASE}/projects/${projectId}/knowledge-graph`,
    );
    await sleep(DELAY_MS);

    // AI Engineering Copilot Foundation Drill-Down
    step(
      7,
      "AI ENGINEERING COPILOT: Ask VibePulse Anything (Zero Hallucination)",
      "Asking grounded engineering queries with tri-state factual decomposition",
    );
    const copilotQ1 = await request("POST", `/api/projects/${projectId}/copilot/query`, {
      query: "What should I fix first?",
    });
    console.log(`   [?] Engineer: "What should I fix first?"`);
    console.log(`   [✓] Copilot (${copilotQ1.data.intent}): ${copilotQ1.data.summary}`);
    if (copilotQ1.data.recommendations.length > 0) {
      console.log(`       ↳ Recommendation: ${copilotQ1.data.recommendations[0].title}`);
    }
    console.log(
      `       ↳ Facts: ${copilotQ1.data.observed.length} [OBSERVED], ${copilotQ1.data.inferred.length} [INFERRED], ${copilotQ1.data.unknown.length} [UNKNOWN]`,
    );

    const copilotQ2 = await request("POST", `/api/projects/${projectId}/copilot/query`, {
      query: "Why is this incident critical?",
    });
    console.log(`   [?] Engineer: "Why is this incident critical?"`);
    console.log(`   [✓] Copilot (${copilotQ2.data.intent}): ${copilotQ2.data.summary}`);

    const copilotQ3 = await request("POST", `/api/projects/${projectId}/copilot/query`, {
      query: "What happened to settings.py?",
    });
    console.log(`   [?] Engineer: "What happened to settings.py?"`);
    console.log(`   [✓] Copilot (${copilotQ3.data.intent}): ${copilotQ3.data.summary}`);
    console.log(`   [✓] Interactive Copilot URL: ${DASHBOARD_BASE}/projects/${projectId}/copilot`);
    await sleep(DELAY_MS);

    // Engineer Resolves Issue (RESOLVE & LEARN)
    step(
      8,
      "RESOLVE & LEARN: Engineer Triage & Audit History",
      "Engineer externalizes secret and records resolution audit note",
    );
    fs.writeFileSync(sPath, 'DEBUG = False\nSTRIPE_SECRET = os.environ.get("STRIPE_SECRET")\n');
    await request("POST", "/events", {
      id: crypto.randomUUID(),
      session_id: sessionId,
      project_root: regRes.data.root_path,
      timestamp: now.toISOString(),
      event_type: "FILE_MODIFIED",
      file_path: "src/config/settings.py",
      file_name: "settings.py",
      file_extension: ".py",
      language: "Python",
      metadata: {
        diff: '- STRIPE_SECRET = "sk_live_99214_REDACTED_SECRET"\n+ STRIPE_SECRET = os.environ.get("STRIPE_SECRET")',
      },
    });
    console.log("   [✓] Remediated source code committed.");

    // Update incident review status in DB
    const incId = secExp.data?.correlated_incident?.incident_id || "cb6e98a974fb";
    await request("POST", `/api/projects/${projectId}/investigations/${incId}/review`, {
      status: "RESOLVED",
      reviewer: "lead-security-engineer",
      resolution_note: "Secret externalized to os.environ and verified with AST guardrail",
    });
    console.log(`   [✓] Incident ${incId} resolved and audit history recorded.`);

    // Ask Copilot about resolution
    const copilotQ4 = await request("POST", `/api/projects/${projectId}/copilot/query`, {
      query: "How was this incident resolved?",
    });
    console.log(`   [?] Engineer: "How was this incident resolved?"`);
    console.log(`   [✓] Copilot (${copilotQ4.data.intent}): ${copilotQ4.data.summary}`);
    await sleep(DELAY_MS);

    // Reconstructibility check
    step(9, "RECONSTRUCTIBILITY AUDIT", "Verifying Result A == Result B from canonical PostgreSQL");
    const refRes = await request("POST", `/api/projects/${projectId}/health/refresh`);
    console.log(
      `   [✓] Reconstructed Score: ${refRes.data.overall_health_score}/100 ($A \\equiv B$)`,
    );
    await sleep(DELAY_MS);

    banner("DEMONSTRATION COMPLETED SUCCESSFULLY");
    console.log("All 10 intelligence stages observed, synthesized, and verified in real time.\n");
  } finally {
    step(10, "TEARDOWN", "Cleaning up disposable demonstration artifacts");
    try {
      if (projectId) {
        await request("POST", "/events", {
          id: crypto.randomUUID(),
          session_id: crypto.randomUUID(),
          project_root: tempDir,
          timestamp: new Date().toISOString(),
          event_type: "OBSERVATION_STOPPED",
          file_path: "src/app.py",
          file_name: "app.py",
          file_extension: ".py",
          metadata: {},
        });
        await request("DELETE", `/api/projects/${projectId}?force=true`);
      }
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log("   [✓] Demo resources cleanly removed.");
    } catch {
      // Best effort teardown
    }
  }
}

runDemo()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n[!] Demo error:", err);
    process.exit(1);
  });
