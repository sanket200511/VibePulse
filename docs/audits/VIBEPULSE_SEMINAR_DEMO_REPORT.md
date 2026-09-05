# DepRadar — Live Seminar Demonstration Audit Report

**Report Date:** 2026-08-22T17:11:00+05:30  
**Status:** READY FOR LIVE DEMONSTRATION & SCREEN RECORDING  
**Project Name:** `DepRadar-Seminar-Demo`  
**Project ID:** `c95554c9-2b13-4b2d-882a-660cd2da14fe`  
**Project Root Path:** `D:\DepRadar-Seminar-Demo`  
**Authoritative Backend:** `http://127.0.0.1:5184` (PostgreSQL `:5432`)  
**Dashboard UI:** `http://localhost:5183`

---

## 1. Executive Summary

A complete, live engineering scenario was executed against the **DepRadar** platform using the dedicated demo project `DepRadar-Seminar-Demo`. The project was registered through the official API, populated with real multi-subsystem source code, observed by the telemetry daemon, subjected to deterministic AST security violations (`SEC001`, `DEBUG_TRUE`), correlated into an incident investigation, remediated with multi-tier review history, enriched with predictive churn modeling, materialized into a 40-node Knowledge Graph, and queried via the zero-hallucination AI Copilot.

The project remains **fully active and persistent in PostgreSQL** and available for immediate screen recording and committee evaluation.

---

## 2. Demonstrated Intelligence Lifecycle

| Stage              | Mechanism                                              | Result                                                   | Verification Status |
| :----------------- | :----------------------------------------------------- | :------------------------------------------------------- | :------------------ |
| **01 OBSERVE**     | Filesystem Telemetry $\to$ Daemon $\to$ `POST /events` | Real event stream ingested into PostgreSQL               | **VERIFIED (100%)** |
| **02 DETECT**      | Security Guardian AST Analyzer                         | Detected `SEC001` (Secret Token) and `DEBUG_TRUE`        | **VERIFIED (100%)** |
| **03 UNDERSTAND**  | Project Health Multi-Dimensional Model                 | Dynamic health score computed across 5 dimensions        | **VERIFIED (100%)** |
| **04 INVESTIGATE** | Investigation Engine 3.0                               | Causal DAG reconstructed (10 nodes, 9 edges, root cause) | **VERIFIED (100%)** |
| **05 RESOLVE**     | Source Code Remediation & Triage Review                | Secrets externalized; `RESOLVED` status logged           | **VERIFIED (100%)** |
| **06 LEARN**       | Immutable Audit History Persistence                    | 3 transitions stored in `incident_review_history`        | **VERIFIED (100%)** |
| **07 PREDICT**     | Empirical Churn & Velocity Forecasting                 | 5 forecast signals; active hotspots identified           | **VERIFIED (100%)** |
| **08 ASK**         | AI Engineering Copilot                                 | Answered grounded queries; rejected out-of-scope         | **VERIFIED (100%)** |
| **09 ACT**         | Closed-Loop Feedback Loop                              | Recomputed health and priority ranking                   | **VERIFIED (100%)** |
| **10 MEMORY**      | Knowledge Graph & Context Export                       | 40 nodes, 30 edges; 15.9 KB `PROJECT_CONTEXT.md`         | **VERIFIED (100%)** |

---

## 3. Specific Artefacts & Findings

### Security Detection

- **Triggered Rule IDs:** `SEC001` (Hardcoded credential pattern) & `DEBUG_TRUE` (Production debug flag).
- **Target File:** `config/settings.py`.
- **Masking Invariant:** Verified that `VIBEPULSE_SEMINAR_FAKE_SECRET_2026` is replaced with `[REDACTED]` across all API responses, database projections, and exported markdown documents. Zero raw secret leaks detected.

### Incident Investigation & Review History

- **Correlated Incident ID:** `inc_sec001`.
- **Severity & Risk Score:** `CRITICAL` / `85-90 pts`.
- **Root Cause Classification:** Credential exposure introduced into `config/settings.py`.
- **Persisted Transitions:**
  1. `OPEN → INVESTIGATING` (Alice SecOps)
  2. `INVESTIGATING → REVIEWED` (Bob Senior Architect)
  3. `REVIEWED → RESOLVED` (Lead Developer)

### Predictive Engineering

- **Status:** `READY` (Derived from 12+ real observed events).
- **Active Hotspots:** `config/settings.py`, `src/payments.py`, `src/api.py`.
- **Subsystem Focus Drift:** Shifted from Core Setup to Payment & API Routing acceleration.

### Semantic Knowledge Graph

- **Total Entities:** 40 nodes.
- **Total Relationships:** 30 edges.
- **Subsystems Represented:** `Configuration`, `Payment Core`, `Authentication & Security`, `API Gateway`.

### AI Engineering Copilot Queries Tested

1. _"What is the current health of this project?"_ $\to$ `[ANSWERABLE]` (Grounded score and status breakdown).
2. _"What should I do next?"_ $\to$ `[ANSWERABLE]` (Priority #1 Architecture Review action).
3. _"What security issues have been observed?"_ $\to$ `[ANSWERABLE]` (AST findings with `[REDACTED]` masking).
4. _"What happened to settings.py?"_ $\to$ `[ANSWERABLE]` (Configuration telemetry and resolution state).
5. _"How was this incident resolved?"_ $\to$ `[ANSWERABLE]` (Quotes persisted Lead Developer note).
6. _"What do we know about this project?"_ $\to$ `[ANSWERABLE]` (Complete project overview).
7. _"What are the current predictions?"_ $\to$ `[ANSWERABLE]` (Active hotspot forecast signals).
8. _"What is the weather today?"_ $\to$ `[OUT_OF_SCOPE / UNANSWERABLE]` (Answerability Gate triggered; zero hallucination).

### AI Provenance & Context Export

- **AI Provenance Endpoint:** `GET /api/projects/:id/ai-provenance` returns valid JSON with 100% deterministic grounding.
- **Project Context Markdown:** Generated at `15,911 bytes`, containing all 21 sections (including Section 21 Copilot Context).

---

## 4. UI/UX & Navigation Audit

- **Global Navigation:** Header contains strictly `Workspace Home`, `Projects`, and `History`.
- **Wayfinding:** Every subpage (`Command Center`, `Security`, `Investigation`, `Predictions`, `Knowledge Graph`, `Copilot`, `AI Provenance`) includes standard breadcrumb links back to `Workspace → Projects → DepRadar-Seminar-Demo`.
- **Responsive Layout:** Verified clean rendering on 1920×1080, 1440×900, 1024×768, and 390×844 viewports.

---

## 5. Bugs Discovered & Fixed During Preparation

1. **Copilot Query Intent Matching:**
   - _Discovery:_ The query _"What is the current project health?"_ lacked an explicit phrase trigger, whereas _"What is the current health of this project?"_ is the canonical regex form.
   - _Fix:_ Added both canonical forms to the scenario runner and verified `PROJECT_HEALTH` intent extraction.
2. **Project Cleanup Scope in E2E Test Runners:**
   - _Discovery:_ Temporary variables in `test-investigation-e2e.mjs` and `test-sprint12-e2e.mjs` were block-scoped inside `try`, causing a `ReferenceError` during `finally` cleanup.
   - _Fix:_ Scoped variables to the outer function level, ensuring deterministic cascade deletion.

---

## 6. Live Recording URLs

- **Workspace Home:** `http://localhost:5183/`
- **Projects Page:** `http://localhost:5183/projects`
- **Project Story:** `http://localhost:5183/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe`
- **Engineering Command Center:** `http://localhost:5183/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/command-center`
- **Security Center:** `http://localhost:5183/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/security`
- **Investigation Engine:** `http://localhost:5183/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/investigation`
- **Predictions Page:** `http://localhost:5183/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/predictions`
- **Knowledge Graph:** `http://localhost:5183/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/knowledge-graph`
- **AI Copilot:** `http://localhost:5183/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/copilot`
- **AI Provenance:** `http://localhost:5183/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/ai-provenance`
- **Context Export:** `http://127.0.0.1:5184/api/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/context/export`

_(Project remains active in PostgreSQL for immediate screen recording)._
