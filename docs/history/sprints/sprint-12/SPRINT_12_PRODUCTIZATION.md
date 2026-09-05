# DepRadar — Sprint 12 Architecture & Productization

## End-to-End Intelligence Loop & Copilot Hardening

Sprint 12 represents the canonical composition and productization layer over the complete 10-stage DepRadar intelligence architecture:

```
OBSERVE ──▶ DETECT ──▶ UNDERSTAND ──▶ INVESTIGATE ──▶ RESOLVE ──▶ LEARN ──▶ PREDICT ──▶ ASK ──▶ ACT
```

---

## 1. Unified Intelligence Command Center

Located at `apps/dashboard/src/pages/command-center/EngineeringCommandCenter.tsx`:

- **Metric Triad**:
  - **Overall Health Score** ($0 \dots 100$, Higher = Better): 5-dimension composite (`Security`, `Engineering`, `Incident`, `Resolution`, `Predictive Risk`).
  - **Security Risk Score** (Points, Higher = Worse): Real-time sum of active AST security findings (`SEC001`, `DEBUG_TRUE`, credential leaks).
  - **Forecast Strength** ($0 \dots 100$, Empirical Baseline): Statistical confidence tier based on historical observation frequency and commit velocity.
- **Embedded AI Copilot Mini-Console**:
  - Direct natural language engineering query input.
  - State-driven suggestion pills based on real project posture.
  - Direct `[Why?]` evidence triggers navigating to Universal Evidence Inspector.
- **Security & Incident Cockpit**:
  - Real-time list of unmitigated findings and active incidents with severity badges.
- **Knowledge Graph Snapshot**:
  - Compact node/edge count overview with quick link to semantic exploration.

---

## 2. Hardened Copilot Architecture (Zero LLM Dependency)

The Copilot query subsystem (`apps/api/app/features/copilot/`) serves as a deterministic orchestration and retrieval engine grounded in PostgreSQL historical telemetry:

### 16 Canonical Engineering Query Families

1. `PROJECT_HEALTH`: Overall health score, letter grade, and dimension breakdown.
2. `SECURITY`: Active AST security rules, credential leaks, and risk contributions.
3. `PRIORITY`: Top recommended remediation action and urgency score.
4. `ENGINEERING_ACTIVITY`: Recent development sessions, commit velocity, and churn.
5. `SUBSYSTEM`: Subsystems under pressure and dependency density.
6. `INCIDENT`: Active unmitigated incidents and incident counts.
7. `INCIDENT_CRITICALITY`: AST rule drivers for incident severity.
8. `INCIDENT_CAUSE`: Root causes and affected source files.
9. `FILE`: Specific file activity, associated findings, and subsystem membership.
10. `KNOWLEDGE_GRAPH`: Semantic entities, relationships (`CONTAINS`, `BELONGS_TO`, `AFFECTS`, `RESOLVED_BY`), and graph traversal.
11. `PREDICTION`: Engineering drift, code churn acceleration, and recurring risks.
12. `RESOLUTION`: Audit history trail and reviewer resolution notes.
13. `PROJECT_OVERVIEW`: Project summary and engineering memory snapshot.
14. `AI_HANDOFF`: Structured context export for downstream AI agents.
15. `EVIDENCE`: Mathematical score decomposition and causal evidence chains.
16. `UNKNOWN`: Out-of-scope query rejection (Answerability Gate).

### Tri-State Provenance Model

- `[OBSERVED]`: Directly recorded telemetry in PostgreSQL (file modifications, sessions, AST rules).
- `[INFERRED]`: Deterministically derived intelligence (health scores, priority rankings, predictions).
- `[UNKNOWN]`: Explicit observation boundaries (out-of-band deployments, CI/CD runners, unobserved services).

### Strict Safety & Invariants

- **Zero Hallucination**: Every assertion maps to database rows or explicit `[UNKNOWN]` markers.
- **Secret Redaction**: Raw credentials (e.g. `VIBEPULSE_SPRINT12_SECRET_2026`, API keys) are strictly masked to `[REDACTED]`.
- **Multi-Project Isolation**: Project A data is completely segregated from Project B.
- **Deterministic Reconstructibility**: Query $A \equiv B$ across repeated executions.
- **Safe Project Deletion**: Project deletion purges only database records and leaves user files on disk untouched.

---

## 3. Verification & Acceptance Results

- **Sprint 12 E2E Acceptance Test (`scripts/test-sprint12-e2e.mjs`)**: 14 / 14 Criteria Passed.
- **Live Command Center Demo (`scripts/demo-command-center.mjs`)**: Seamless 10-stage presentation sequence executed.
- **Pytest Suite (`uv run pytest`)**: 347 / 347 tests passed.
- **Daemon Suite (`pnpm --filter @depradar/daemon test`)**: 130 / 130 tests passed.
- **TypeScript Typecheck (`pnpm typecheck`)**: 5 / 5 workspace packages passed with 0 errors.
- **ESLint & Ruff Lint (`pnpm lint`)**: 5 / 5 workspace packages passed with 0 errors.
