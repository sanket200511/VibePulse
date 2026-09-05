# Sprint 12: Productization, Copilot Hardening & End-to-End Intelligence Loop

## Architectural Specification & Execution Plan

---

## 1. Current Architecture & Source of Truth

DepRadar already possesses 10 canonical intelligence subsystems:

```
[ Raw Filesystem Events ]
          │
          ▼
   1. Observation Engine 2.0 (Daemon & Ingestion Gate)
          │
          ▼  (Stored in PostgreSQL: development_events, sessions, event_analyses)
   2. Security Intelligence 2.0 (AST Rule Matching & Risk Contribution)
          │
          ▼
   3. Investigation Engine 3.0 (Correlated Incidents & Causal Graph)
          │
          ▼
   4. Incident Collaboration & Resolution Intelligence (Triage Reviews & Audit History)
          │
          ▼
   5. Predictive Engineering Intelligence (Forecast Signals, Hotspots & Drift)
          │
          ▼
   6. Unified Project Health (5-Dimension Mathematical Decomposition & Priority Engine)
          │
          ▼
   7. Trust, Explainability & Evidence Intelligence (Universal Causal Chains & Decomposition)
          │
          ▼
   8. Engineering Knowledge Graph & Project Memory 2.0 (Relational Graph & AI Models)
          │
          ▼
   9. AI Engineering Copilot Foundation (12 Canonical Intents, Tri-State Provenance, Answerability Gate)
          │
          ▼
   10. Unified Engineering Command Center (Unified Project Dashboard)
```

### Invariant Rules

- **PostgreSQL is the ONLY canonical ground truth**.
- Every intelligence layer (Health, Security, Incidents, Predictions, Knowledge Graph, Copilot, Explanations) is a **pure deterministic derived projection**.
- **Zero Hallucination / No LLM dependency**: The query engine and answer synthesizers compute deterministic factual packages directly from canonical PostgreSQL telemetry.
- **Zero Raw Secret Exposure**: All credentials matching security rules/regexes are masked to `[REDACTED]`.
- **Multi-Project Isolation**: Telemetry and intelligence of Project A never leak into Project B.
- **Reconstructibility**: $A \equiv B$.

---

## 2. Sprint 12 Objectives & Goals

Sprint 12 focuses on **Productization, Copilot Hardening, and the Closed-Loop End-to-End Intelligence Flow**:

1. **Copilot Query Engine Hardening**:
   - Support all 16 canonical engineering queries with rich, grounded factual decompositions, intent classification, entity extraction, prioritized recommendations, deep-links, and evidence inspector triggers.
   - Robust Answerability Gate with graceful boundary explanations for ungrounded/out-of-scope queries (e.g. Bitcoin price, election results, weather, private emails).
2. **Unified Intelligence Command Center Productization**:
   - Enhance `EngineeringCommandCenter.tsx` to serve as the unified cockpit presenting:
     - Project Header (observation status, health, focus, session status)
     - Health Overview (clearly distinguishing Health Score [higher=better], Risk Score [higher=worse], and Forecast Strength)
     - Security Posture & Recurring Rules + `[Investigate]`
     - Active Unresolved Incidents + `[Investigate]`, `[Resolve]`
     - Predictive Signals ("What should we watch next?", hotspots, drift)
     - Knowledge Graph Snapshot (compact 2-hop visualization + `[Explore Knowledge Graph]`)
     - Embedded Compact Copilot Console with state-driven suggestions
3. **Closed-Loop Engineering Workflow**:
   - `OBSERVE -> DETECT -> UNDERSTAND -> INVESTIGATE -> RESOLVE -> LEARN -> PREDICT -> ASK -> ACT`
   - Real telemetry generates security findings, correlated incidents, health drops, and predictive signals. The engineer asks Copilot questions, investigates root cause, performs a resolution action, logs review notes, witnesses health recovery and prediction updates, and queries Copilot to verify resolution history.
4. **Copilot Evidence UX & Universal Evidence Inspector**:
   - Every factual claim and recommendation carries `[Why?]` buttons opening the Universal Evidence Inspector drawer.
5. **Project Memory 2.0 AI Handoff Export**:
   - Complete `PROJECT_CONTEXT.md` export covering all 20 canonical sections with explicit `[UNKNOWN]` markers for unobserved domains and verified zero-leak secret redaction.
6. **Robust Project Lifecycle & Persistence**:
   - Safe project deletion without touching local filesystem directories; safe telemetry cascade; surviving complete server and supervisor restarts.
7. **Exhaustive Testing & Verification**:
   - Pytest suite, daemon test suite, workspace typecheck/lint, Sprint 12 E2E acceptance test (`test-sprint12-e2e.mjs`), live demonstration script (`demo-command-center.mjs`), Seminar Doctor audit.

---

## 3. Detailed Component Plan

### A. Copilot Hardening (`apps/api/app/features/copilot/`)

- Expand `query_classifier.py` rules for all 16 canonical question variants:
  - Health & Risk: _"What is the current health of this project?"_, _"Why is this project unhealthy?"_
  - Security & Recurring Rules: _"What security problems do we currently have?"_, _"What security findings keep recurring?"_
  - Priorities: _"What should I fix first?"_
  - Activity & Changes: _"What happened recently?"_, _"Which files are causing the most activity?"_
  - Subsystems: _"Which subsystem is under pressure?"_
  - Incidents & Causes: _"What incidents are currently unresolved?"_, _"Why was this incident classified as critical?"_, _"What caused this incident?"_
  - File History & Relationships: _"What changed in auth.py?"_, _"What is connected to auth.py?"_
  - Predictions & Hotspots: _"What should we watch next?"_
  - Resolution & Audit: _"How was this incident resolved?"_
  - Project Knowledge & AI Handoff: _"What do we know about this project?"_, _"Generate an AI handoff for this project."_
  - Out-of-Scope Detection: crypto, weather, elections, private emails -> `answerable: false`, `evidence_strength: INSUFFICIENT`.
- Expand `context_builder.py` & `service.py` to synthesize specific narrative answers, fact items, and deep-link actions for all 16 queries.

### B. Unified Intelligence Command Center (`apps/dashboard/src/pages/command-center/`)

- Upgrade `EngineeringCommandCenter.tsx` with:
  - Top Metrics Bar: Health Score (0-100), Risk Score (0-100), Predictive Forecast Strength, Observation Status.
  - Active Incidents Grid with quick `[Resolve]` and `[Investigate]` triggers.
  - Predictive Signals card with hotspots and focus drift indicators.
  - Compact Knowledge Graph snapshot visualization.
  - Embedded Copilot mini-chat console with dynamic suggestion pills.
  - Evidence Inspector drawer integration.

### C. End-to-End Closed Loop Demo & Acceptance Scripts (`scripts/`)

- Update `scripts/demo-command-center.mjs` to execute the full 10-stage loop:
  `OBSERVE -> DETECT -> UNDERSTAND -> INVESTIGATE -> RESOLVE -> LEARN -> PREDICT -> ASK -> ACT`.
- Create `scripts/test-sprint12-e2e.mjs` verifying:
  1. All 16 canonical Copilot queries + out-of-scope rejections.
  2. End-to-end incident creation, investigation, resolution, and audit history.
  3. Secret safety (`[REDACTED]` masking across all endpoints).
  4. Multi-project isolation (Project A vs Project B).
  5. Deterministic reconstructibility ($A \equiv B$).
  6. Project lifecycle and safe deletion.

---

## 4. Verification & Quality Gates

1. Backend Tests: `uv run pytest` -> 347+ tests passed.
2. Daemon Tests: `pnpm --filter @depradar/daemon test` -> 130 tests passed.
3. Typecheck: `pnpm typecheck` -> 0 errors across 5 packages.
4. Lint: `pnpm lint` -> 0 errors across 5 packages.
5. Sprint 12 E2E: `node scripts/test-sprint12-e2e.mjs` -> All criteria passed.
6. Live Demo: `node scripts/demo-command-center.mjs` -> All stages passed.
7. Seminar Doctor: `node scripts/seminar-doctor.mjs` -> Ready.
