# DepRadar — Post-Sprint 12 Stabilization & Architecture Audit

> **Status**: Historical Snapshot (Post-Sprint 12 Stabilization Baseline)
> **Superseded by**: [`docs/audits/FINAL_PROJECT_STATUS.md`](FINAL_PROJECT_STATUS.md) & [`docs/audits/FINAL_RELEASE_ACCEPTANCE.md`](FINAL_RELEASE_ACCEPTANCE.md)

**Document Status**: ARCHITECTURE AUDIT & STABILIZATION BASELINE (HISTORICAL)
**Sprint Phase**: Post-Sprint 12 Stabilization & Finalization
**Repository**: `DepRadar` Monorepo
**Target Invariant**: PostgreSQL Historical Telemetry as Single Canonical Ground Truth ($A \equiv B$)

---

## 1. What Is Actually Implemented

| Subsystem                                   | Canonical Service Location                                   | Database Table(s)                                   | Status               | Test Coverage                            |
| ------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------- | -------------------- | ---------------------------------------- |
| **1. Observation Engine 2.0**               | `apps/daemon/src/`, `apps/api/app/features/events/`          | `development_events`, `sessions`                    | **PRODUCTION-READY** | 130 daemon tests, 25 event/session tests |
| **2. Security Intelligence 2.0**            | `apps/api/app/features/security_intelligence/`               | `event_analyses`, `development_events`              | **PRODUCTION-READY** | 25 security acceptance & AST tests       |
| **3. Investigation Engine 3.0**             | `apps/api/app/features/investigation/`                       | `event_analyses`, `development_events`              | **PRODUCTION-READY** | 18 investigation & search tests          |
| **4. Incident Collaboration & Resolution**  | `apps/api/app/features/investigation/`                       | `incident_review_states`, `incident_review_history` | **PRODUCTION-READY** | 12 review history & workflow tests       |
| **5. Unified Project Health**               | `apps/api/app/features/project_health/`                      | Pure projection over events & analyses              | **PRODUCTION-READY** | 15 health scorecard & priority tests     |
| **6. Predictive Intelligence**              | `apps/api/app/features/predictive_intelligence/`             | Pure projection over historical sessions & drift    | **PRODUCTION-READY** | 12 prediction & hotspot tests            |
| **7. Engineering DNA & Insights**           | `apps/api/app/features/engineering_dna/`, `insights/`        | Pure projection over commit churn & languages       | **PRODUCTION-READY** | 30 insights generation tests             |
| **8. Evidence Intelligence**                | `apps/api/app/features/evidence/`                            | Pure projection over scores & causal chains         | **PRODUCTION-READY** | 10 evidence explainability tests         |
| **9. Knowledge Graph & Project Memory 2.0** | `apps/api/app/features/knowledge_graph/`, `project_context/` | `project_contexts` + runtime graph projection       | **PRODUCTION-READY** | 16 knowledge graph & export tests        |
| **10. AI Engineering Copilot Foundation**   | `apps/api/app/features/copilot/`                             | Multi-domain aggregator over canonical PostgreSQL   | **PRODUCTION-READY** | 16 canonical query family tests          |
| **11. Command Center Cockpit**              | `apps/dashboard/src/pages/command-center/`                   | React/Vite dashboard + WebSocket live stream        | **PRODUCTION-READY** | End-to-end integration demo & browser UI |

---

## 2. What Is Duplicated (Audit & Resolution)

- **Prior Duplications Resolved**:
  - Legacy standalone scoring algorithms in early prototypes have been completely replaced by `UnifiedProjectHealth` in `app/features/project_health/service.py`.
  - Copilot and Evidence Inspector do **not** maintain duplicate risk matrices; they call `compute_security_intelligence()` and `calculate_unified_project_health()`.
- **Zero In-Memory Caching Invariants**:
  - All metrics are deterministically derived projections from PostgreSQL tables:
    `development_events`, `sessions`, `event_analyses`, `projects`, `project_contexts`, `incident_review_states`, `incident_review_history`.

---

## 3. What Is Incomplete / To Be Hardened in this Finalization Sprint

1. **AI Handoff Guidance**:
   - `export.py` / `PROJECT_CONTEXT.md` needs the explicit section `"How an AI Agent Should Use This Context"` defining authoritative vs inferred vs unknown rules.
2. **Safe Project Deletion Dialog**:
   - Verify frontend project delete modal explicitly states: _"This removes DepRadar's recorded telemetry only. Your files will not be deleted."_
3. **Command Center Visual Clarity**:
   - Ensure the professors/judges immediately understand:
     - Health Score ($0 \dots 100$, **Higher = Better**)
     - Security Risk Score (Points, **Higher = Worse**)
     - Forecast Strength ($0 \dots 100$, **Empirical Evidence Strength**)
4. **Failure Recovery Verification**:
   - Verify daemon and WebSocket automatic reconnect behaviors when FastAPI or Redis restarts.

---

## 4. What Is Experimental vs Production-Ready

- **Production-Ready**:
  - File watching via chokidar (`apps/daemon`).
  - AST Tree-Sitter & Python AST static rules (`SEC001`, `DEBUG_TRUE`, credential leaks).
  - PostgreSQL schema with 8 Alembic migrations (`0001` through `0008`).
  - Multi-project isolation and deterministic reconstructibility ($A \equiv B$).
  - Copilot 16-intent classifier and tri-state provenance generator (`[OBSERVED]`, `[INFERRED]`, `[UNKNOWN]`).
- **Excluded / Not Implemented by Design**:
  - External non-deterministic LLM API dependencies (Copilot is 100% deterministic).
  - Unverifiable third-party CVE scraping.
  - Fabricated mock data.

---

## 5. Security & Secret Redaction Audit

- **Sanitization Rule**: Raw credentials matching regex token patterns (`sk_live_*`, `AKIA*`, `ghp_*`, passwords) are masked to `[REDACTED]`.
- **Zero Leakage**: Verified across API responses, WebSocket messages, logs, Knowledge Graph, Copilot answers, and `PROJECT_CONTEXT.md`.

---

## 6. Verification Status

- **Pytest**: 347 / 347 passed
- **Daemon Vitest**: 130 / 130 passed
- **Typecheck**: 5 / 5 packages passed with 0 errors
- **Lint**: 5 / 5 packages passed with 0 errors
- **Sprint 12 E2E**: 14 / 14 criteria passed
- **Seminar Demo**: Passed
