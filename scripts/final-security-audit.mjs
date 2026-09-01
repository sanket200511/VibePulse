#!/usr/bin/env node
/**
 * VIBEPULSE — SPRINT 14 FINAL SECURITY & SECRET REDACTION AUDIT
 *
 * Injects synthetic controlled secrets and verifies zero leakage across:
 * 1. Event Ingestion API (/events)
 * 2. Security Intelligence API (/security)
 * 3. Copilot Query API (/copilot/query)
 * 4. Knowledge Graph API (/knowledge-graph)
 * 5. Project Context Markdown Export (/context/export)
 * 6. Multi-Project Isolation Boundary
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const API_BASE = process.env.VIBEPULSE_API_URL || process.env.API_BASE || "http://127.0.0.1:5184";
const SYNTHETIC_SECRET = "VIBEPULSE_AUDIT_SYNTHETIC_KEY_9999";
const SYNTHETIC_STRIPE = "sk_live_99887766554433221100aabb";

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

async function runSecurityAudit() {
  console.log("================================================================");
  console.log("        VIBEPULSE SPRINT 14 FORENSIC SECURITY AUDIT             ");
  console.log("================================================================");

  const tmpRootA = fs.mkdtempSync(path.join(os.tmpdir(), "vp-sec-audit-a-"));
  const tmpRootB = fs.mkdtempSync(path.join(os.tmpdir(), "vp-sec-audit-b-"));

  try {
    const regA = await request("POST", "/api/projects", {
      display_name: "Audit Project A",
      root_path: tmpRootA,
    });
    const projA = regA.data.id;

    const regB = await request("POST", "/api/projects", {
      display_name: "Audit Project B",
      root_path: tmpRootB,
    });
    const projB = regB.data.id;

    // Inject events with synthetic secrets into Project A
    const sessionId = crypto.randomUUID();
    await request("POST", "/events", {
      schema_version: 1,
      event_type: "FILE_MODIFIED",
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      project_root: tmpRootA,
      file_path: "config/keys.py",
      file_name: "keys.py",
      file_extension: ".py",
      language: "Python",
      metadata: {
        diff: `+ API_SECRET = "${SYNTHETIC_SECRET}"\n+ STRIPE_KEY = "${SYNTHETIC_STRIPE}"`,
      },
    });

    const results = [];

    // 1. Check Security Intelligence
    const secRes = await request("GET", `/api/projects/${projA}/security`);
    const secRaw = JSON.stringify(secRes.data);
    const secLeaked = secRaw.includes(SYNTHETIC_SECRET) || secRaw.includes(SYNTHETIC_STRIPE);
    results.push({
      surface: "Security Intelligence API",
      status: !secLeaked ? "PASS" : "FAIL",
      redaction: secRaw.includes("[REDACTED]") ? "VERIFIED" : "UNMASKED",
    });

    // 2. Check Copilot Query
    const copilotRes = await request("POST", `/api/projects/${projA}/copilot/query`, {
      query: "What security problems do we currently have?",
    });
    const copRaw = JSON.stringify(copilotRes.data);
    const copLeaked = copRaw.includes(SYNTHETIC_SECRET) || copRaw.includes(SYNTHETIC_STRIPE);
    results.push({
      surface: "Copilot Response API",
      status: !copLeaked ? "PASS" : "FAIL",
      redaction: copRaw.includes("[REDACTED]") ? "VERIFIED" : "CLEAN",
    });

    // 3. Check Knowledge Graph
    const kgRes = await request("GET", `/api/projects/${projA}/knowledge-graph`);
    const kgRaw = JSON.stringify(kgRes.data);
    const kgLeaked = kgRaw.includes(SYNTHETIC_SECRET) || kgRaw.includes(SYNTHETIC_STRIPE);
    results.push({
      surface: "Knowledge Graph API",
      status: !kgLeaked ? "PASS" : "FAIL",
      redaction: kgRaw.includes("[REDACTED]") ? "VERIFIED" : "CLEAN",
    });

    // 4. Check Context Export
    const ctxRes = await request("GET", `/api/projects/${projA}/context/export`);
    const ctxRaw = typeof ctxRes.data === "string" ? ctxRes.data : ctxRes.raw;
    const ctxLeaked = ctxRaw.includes(SYNTHETIC_SECRET) || ctxRaw.includes(SYNTHETIC_STRIPE);
    results.push({
      surface: "Project Context Export (Markdown)",
      status: !ctxLeaked ? "PASS" : "FAIL",
      redaction: ctxRaw.includes("[REDACTED]") ? "VERIFIED" : "CLEAN",
    });

    // 5. Check Multi-Project Isolation
    const secB = await request("GET", `/api/projects/${projB}/security`);
    const isolated = (secB.data.security_findings || []).length === 0;
    results.push({
      surface: "Multi-Project Isolation",
      status: isolated ? "PASS" : "FAIL",
      redaction: "ISOLATED",
    });

    console.table(results);

    const allPassed = results.every((r) => r.status === "PASS");
    console.log(
      allPassed ? "✅ FORENSIC SECURITY AUDIT: ALL SURFACES VERIFIED SAFE!" : "❌ AUDIT FAILED!",
    );

    if (!allPassed) process.exit(1);
  } finally {
    try {
      if (projA) await request("DELETE", `/api/projects/${projA}?force=true`);
      if (projB) await request("DELETE", `/api/projects/${projB}?force=true`);
    } catch {}
    fs.rmSync(tmpRootA, { recursive: true, force: true });
    fs.rmSync(tmpRootB, { recursive: true, force: true });
  }
}

runSecurityAudit().catch((err) => {
  console.error("Security audit failed:", err);
  process.exit(1);
});
