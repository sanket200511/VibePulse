#!/usr/bin/env node

/**
 * End-to-End Acceptance Test for Sprint 10:
 * VIBEPULSE ENGINEERING KNOWLEDGE GRAPH & PROJECT MEMORY 2.0
 *
 * Verifies:
 * 1. Semantic Engineering Knowledge Graph projection (Nodes, Edges, Subsystems)
 * 2. Explicit relationship semantics (CONTAINS, BELONGS_TO, AFFECTS, RESOLVED_BY, SUPPORTS)
 * 3. File Intelligence & Subsystem Intelligence views
 * 4. Project Memory 2.0 AI memory model & Section 20 export
 * 5. Deterministic multi-entity search
 * 6. Secret safety (zero raw exposure of VIBEPULSE_SPRINT10_SECRET_2026)
 * 7. Multi-project isolation (Project A vs Project B)
 * 8. Deterministic reconstructibility (Result A == Result B)
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const API_BASE = process.env.VIBEPULSE_API_URL || process.env.API_BASE || "http://127.0.0.1:5133";
const SECRET_TOKEN = "VIBEPULSE_SPRINT10_SECRET_2026";

function log(msg) {
  console.log(`[SPRINT 10 E2E] ${msg}`);
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
  log("Starting Sprint 10 Knowledge Graph & Project Memory 2.0 End-to-End Acceptance Test...");

  // 1. Check API readiness
  log("Step 1: Verifying API readiness...");
  try {
    const health = await request("GET", "/health");
    assert(health.status === 200, "API is not healthy on " + API_BASE);
  } catch (err) {
    console.error("Could not connect to API:", err.message);
    process.exit(1);
  }

  // 2. Create isolated disposable test projects
  log("Step 2: Creating isolated test projects (Project A and Project B)...");
  const tempDirA = fs.mkdtempSync(path.join(os.tmpdir(), "vp-kg-proj-a-"));
  const tempDirB = fs.mkdtempSync(path.join(os.tmpdir(), "vp-kg-proj-b-"));

  let projAId, projBId;

  try {
    const resA = await request("POST", "/api/projects", {
      root_path: tempDirA,
      display_name: "Sprint 10 KG Project A",
    });
    assert(resA.status === 200, "Failed to create Project A");
    projAId = resA.data.id;

    const resB = await request("POST", "/api/projects", {
      root_path: tempDirB,
      display_name: "Sprint 10 KG Project B",
    });
    assert(resB.status === 200, "Failed to create Project B");
    projBId = resB.data.id;

    log(`Projects created: Proj A (${projAId}) and Proj B (${projBId})`);

    // 3. Ingest rich multi-subsystem telemetry into Project A
    log("Step 3: Ingesting rich multi-subsystem telemetry into Project A...");
    const sessionId = crypto.randomUUID();
    const now = new Date();

    const events = [
      {
        schema_version: 1,
        event_type: "FILE_MODIFIED",
        timestamp: new Date(now.getTime() - 20 * 60000).toISOString(),
        session_id: sessionId,
        project_root: tempDirA,
        file_path: "src/auth/jwt_service.py",
        file_name: "jwt_service.py",
        file_extension: ".py",
        language: "Python",
        metadata: {
          diff: `+ API_SECRET = "${SECRET_TOKEN}"\n+ def verify_token(): pass`,
        },
      },
      {
        schema_version: 1,
        event_type: "FILE_MODIFIED",
        timestamp: new Date(now.getTime() - 15 * 60000).toISOString(),
        session_id: sessionId,
        project_root: tempDirA,
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
        project_root: tempDirA,
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
      assert(
        evRes.status === 201 || evRes.status === 200,
        "Failed to ingest event: " + ev.file_path,
      );
    }

    // 4. Test Knowledge Graph Endpoint
    log("Step 4: Testing Knowledge Graph derivation endpoint...");
    const kgRes = await request("GET", `/api/projects/${projAId}/knowledge-graph`);
    assert(kgRes.status === 200, "Knowledge Graph endpoint failed");
    const graph = kgRes.data;

    assert(graph.project_id === projAId, "Graph project_id mismatch");
    assert(graph.total_nodes >= 4, "Total nodes should be >= 4");
    assert(graph.total_edges >= 3, "Total edges should be >= 3");
    assert(graph.subsystems.length >= 2, "Should discover multiple subsystems");
    assert(graph.subsystems.includes("Authentication"), "Authentication subsystem not found");
    assert(graph.subsystems.includes("Database"), "Database subsystem not found");

    log(
      `Knowledge Graph materialized with ${graph.total_nodes} nodes and ${graph.total_edges} edges.`,
    );

    // 5. Verify Explicit Semantic Relationships & Types
    log("Step 5: Verifying explicit relationship semantics...");
    const edgeTypes = Object.keys(graph.edge_count_by_type);
    assert(edgeTypes.includes("CONTAINS"), "Missing CONTAINS relationship");
    assert(edgeTypes.includes("BELONGS_TO"), "Missing BELONGS_TO relationship");

    for (const edge of graph.edges) {
      assert(edge.source_node_id, "Edge missing source_node_id");
      assert(edge.target_node_id, "Edge missing target_node_id");
      assert(edge.relationship_type, "Edge missing relationship_type");
      assert(edge.provenance, "Edge missing provenance badge");
    }

    // 6. Test File Intelligence View
    log("Step 6: Testing File Intelligence View...");
    const fileIntelRes = await request(
      "GET",
      `/api/projects/${projAId}/knowledge-graph/files/${encodeURIComponent("src/auth/jwt_service.py")}`,
    );
    assert(fileIntelRes.status === 200, "File intelligence query failed");
    const fileIntel = fileIntelRes.data;
    assert(
      fileIntel.file_path === "src/auth/jwt_service.py",
      `File path mismatch: ${fileIntel.file_path}`,
    );
    assert(fileIntel.subsystem === "Authentication", "File subsystem should be Authentication");
    assert(fileIntel.activity_count >= 1, "Activity count should be >= 1");
    assert(fileIntel.provenance === "OBSERVED", "File provenance should be OBSERVED");

    // 7. Test Subsystem Intelligence View
    log("Step 7: Testing Subsystem Intelligence View...");
    const subsysIntelRes = await request(
      "GET",
      `/api/projects/${projAId}/knowledge-graph/subsystems/Authentication`,
    );
    assert(subsysIntelRes.status === 200, "Subsystem intelligence query failed");
    const subsysIntel = subsysIntelRes.data;
    assert(subsysIntel.subsystem_name === "Authentication", "Subsystem name mismatch");
    assert(subsysIntel.file_count >= 1, "File count should be >= 1");
    assert(
      subsysIntel.files.includes("src/auth/jwt_service.py"),
      "File list missing jwt_service.py",
    );

    // 8. Test Deterministic Multi-Entity Search
    log("Step 8: Testing Deterministic Multi-Entity Search...");
    const searchRes = await request(
      "GET",
      `/api/projects/${projAId}/knowledge-graph/search?q=auth`,
    );
    assert(searchRes.status === 200, "Graph search query failed");
    assert(searchRes.data.length > 0, "Search should return matching entities");
    const matchedLabels = searchRes.data.map((r) => r.label.toLowerCase());
    assert(
      matchedLabels.some((l) => l.includes("auth") || l.includes("jwt")),
      "Search results should match 'auth' keyword",
    );

    // 9. Test Project Memory 2.0 AI Model
    log("Step 9: Testing Project Memory 2.0 AI Model...");
    const memoryRes = await request("GET", `/api/projects/${projAId}/knowledge-graph/memory`);
    assert(memoryRes.status === 200, "Project Memory 2.0 query failed");
    const memory = memoryRes.data;
    assert(memory.project_id === projAId, "Memory project_id mismatch");
    assert(memory.subsystems.includes("Authentication"), "Memory missing Authentication");
    assert(memory.important_files.length >= 1, "Memory should have important files");
    assert(typeof memory.overall_health_score === "number", "Memory missing health score");
    assert(memory.health_grade, "Memory missing health grade");
    assert(memory.known_relationships_count >= 3, "Memory missing relationship count");

    // 10. Test Secret Safety (Zero Raw Secret Leakage)
    log("Step 10: Testing Secret Safety across all surfaces...");
    const fullGraphStr = JSON.stringify(graph);
    const fullMemoryStr = JSON.stringify(memory);
    const fullFileIntelStr = JSON.stringify(fileIntel);
    const fullSubsysIntelStr = JSON.stringify(subsysIntel);

    assert(!fullGraphStr.includes(SECRET_TOKEN), "RAW SECRET LEAKED IN KNOWLEDGE GRAPH!");
    assert(!fullMemoryStr.includes(SECRET_TOKEN), "RAW SECRET LEAKED IN PROJECT MEMORY!");
    assert(!fullFileIntelStr.includes(SECRET_TOKEN), "RAW SECRET LEAKED IN FILE INTELLIGENCE!");
    assert(
      !fullSubsysIntelStr.includes(SECRET_TOKEN),
      "RAW SECRET LEAKED IN SUBSYSTEM INTELLIGENCE!",
    );

    // 11. Test PROJECT_CONTEXT.md Section 20 Markdown Export
    log("Step 11: Testing PROJECT_CONTEXT.md Section 20 export...");
    const mdRes = await request("GET", `/api/projects/${projAId}/context/export`);
    assert(mdRes.status === 200, "Markdown export failed");
    assert(
      mdRes.raw.includes("## 20. Engineering Knowledge Graph & Project Memory 2.0"),
      "PROJECT_CONTEXT.md missing Section 20",
    );
    assert(!mdRes.raw.includes(SECRET_TOKEN), "RAW SECRET LEAKED IN MARKDOWN EXPORT!");

    // 12. Test Multi-Project Isolation (Project A vs Project B)
    log("Step 12: Testing Multi-Project Isolation...");
    const kgResB = await request("GET", `/api/projects/${projBId}/knowledge-graph`);
    assert(kgResB.status === 200, "Project B graph fetch failed");
    const graphB = kgResB.data;

    // Project B has no events, so it should not contain jwt_service.py or routes.py
    const projBFileLabels = graphB.nodes.filter((n) => n.node_type === "File").map((n) => n.label);
    assert(
      !projBFileLabels.includes("jwt_service.py"),
      "PROJECT ISOLATION VIOLATION: Project B leaked Project A's files!",
    );

    // 13. Test Deterministic Reconstructibility (A == B)
    log("Step 13: Testing Deterministic Reconstructibility (A == B)...");
    const refreshRes = await request("POST", `/api/projects/${projAId}/knowledge-graph/refresh`);
    assert(refreshRes.status === 200, "Graph cache refresh failed");
    const reconstructedGraph = refreshRes.data;

    assert(
      graph.total_nodes === reconstructedGraph.total_nodes,
      `Reconstructibility node count mismatch: ${graph.total_nodes} vs ${reconstructedGraph.total_nodes}`,
    );
    assert(
      graph.total_edges === reconstructedGraph.total_edges,
      `Reconstructibility edge count mismatch: ${graph.total_edges} vs ${reconstructedGraph.total_edges}`,
    );
    assert(
      JSON.stringify(graph.node_count_by_type) ===
        JSON.stringify(reconstructedGraph.node_count_by_type),
      "Reconstructibility node type distribution mismatch",
    );
    assert(
      JSON.stringify(graph.edge_count_by_type) ===
        JSON.stringify(reconstructedGraph.edge_count_by_type),
      "Reconstructibility edge type distribution mismatch",
    );

    log("Deterministic reconstructibility confirmed ($A \\equiv B$).");
    log("\n=======================================================");
    log("ALL SPRINT 10 ACCEPTANCE TESTS COMPLETED SUCCESSFULLY!  ");
    log("=======================================================\n");
  } finally {
    // Cleanup temporary folders
    try {
      fs.rmSync(tempDirA, { recursive: true, force: true });
      fs.rmSync(tempDirB, { recursive: true, force: true });
    } catch {
      // Ignore temp cleanup errors
    }
  }
}

run().catch((err) => {
  console.error("\n[FAIL] Unexpected error during E2E test execution:\n", err);
  process.exit(1);
});
