# Sprint 7 Architecture & Product Safety Gate: Unified Project Health & Intelligence Orchestrator

**Status:** ARCHITECTURE & SAFETY GATE COMPLETE (Awaiting Approval)  
**Date:** 2026-08-21  
**Scope:** Sprint 7 Unified Health & Intelligence Orchestrator

---

## 1. Executive Summary & Objective

VibePulse has successfully built and verified seven core intelligence and telemetry subsystems across Sprints 1–6:

$$\mathbf{OBSERVE \longrightarrow DETECT \longrightarrow INVESTIGATE \longrightarrow RESOLVE \longrightarrow LEARN \longrightarrow ANTICIPATE \longrightarrow \left[\text{Sprint 7: UNIFIED HEALTH}\right]}$$

Sprint 7 does **NOT** build another isolated intelligence pipeline or redundant scoring engine.  
Instead, it introduces the **Unified Project Health & Intelligence Orchestrator**: a pure, evidence-backed synthesis layer that consumes existing telemetry and projections to answer the five fundamental engineering leadership questions:

1. **What is happening in this project?** (Activity velocity, focus evolution, session continuity)
2. **What is risky right now?** (Security posture, active findings, blast radius)
3. **Which incidents require attention?** (Open incident load, triage status, assigned owners)
4. **What is likely to become a problem?** (Predictive signals, hotspots, resolution regressions)
5. **What should the engineer do next?** (Deterministic "What Should I Do Next?" priority ranking)

---

## 2. Documentation Discrepancy Report

An audit of existing repository documentation against the actual implementation identified the following discrepancies:

| Document                         | Stated Claim in Document                                                    | Actual Repository Reality                                                                                                               | Action in Sprint 7                                                            |
| -------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `docs/FULL_SYSTEM_AUDIT.md`      | Stated backend test count: 319 passed                                       | Current backend test suite: **327 passed** (post-Sprint 6)                                                                              | Update baseline test count to 327                                             |
| `docs/FULL_SYSTEM_AUDIT.md`      | Alembic migrations: 0006                                                    | Current Alembic migrations: **0008** (`0007_incident_review_states`, `0008_incident_review_history`)                                    | Align migration matrix to 0008                                                |
| `docs/PROJECT_CONTEXT.md`        | Documented 16 context sections                                              | Current export includes **Section 17: Predictive Engineering Signals**                                                                  | Document Section 17 & plan Section 18 for Unified Health                      |
| `docs/INVESTIGATION_ENGINE_3.md` | Documented `/investigations/health-summary` as a lightweight incident count | Lightweight incident summary exists in `investigation/service.py`                                                                       | Elevate into full Unified Health Orchestrator without breaking existing route |
| Terminology Consistency          | Varied use of "risk score", "forecast score", and "health score"            | Risk is negative (0=safe, 100=critical); Health is positive (100=excellent, 0=critical); Forecast Strength is additive evidence (0-100) | Enforce standardized dimensional definitions across all endpoints             |

---

## 3. Canonical Source-of-Truth Matrix

| Entity / State                  | Source Type              | Storage Location      | Reconstructible?         | Fact vs Human Decision                          |
| ------------------------------- | ------------------------ | --------------------- | ------------------------ | ----------------------------------------------- |
| `development_events`            | Authoritative Truth      | PostgreSQL table      | Canonical Base           | **Observed Facts** (Raw file changes, diffs)    |
| `sessions`                      | Authoritative Truth      | PostgreSQL table      | Canonical Base           | **Observed Facts** (Session intervals, tools)   |
| `event_analyses`                | Authoritative Truth      | PostgreSQL table      | Canonical Base           | **Observed Facts** (AST analysis, static rules) |
| `project_contexts`              | Materialized Context     | PostgreSQL table      | 100% from Events         | **Observed / Inferred Facts**                   |
| `incident_review_states`        | Authoritative State      | PostgreSQL table      | **Persistent Truth**     | **Human Decision** (Status, owner, priority)    |
| `incident_review_history`       | Authoritative Audit      | PostgreSQL table      | **Persistent Truth**     | **Human Decision** (Notes, status transitions)  |
| `security_intelligence`         | Derived Projection       | Memory / Calculated   | 100% from Telemetry      | **Observed / Inferred Facts**                   |
| `engineering_dna`               | Derived Projection       | Memory / Calculated   | 100% from Telemetry      | **Observed Facts**                              |
| `investigation` (Graph 3.0)     | Derived Synthesis        | Dynamic Query         | 100% from Telemetry      | **Observed Correlation**                        |
| `predictive_intelligence`       | Derived Projection       | Memory / Calculated   | 100% from Telemetry      | **Evidence Projection**                         |
| **`project_health` (Sprint 7)** | **Unified Orchestrator** | **Derived Synthesis** | **100% Reconstructible** | **Composite Synthesis**                         |

---

## 4. Canonical Infrastructure Reuse Map (Zero Duplication)

The Sprint 7 Orchestrator will **strictly consume existing canonical implementations**:

```
                              ┌────────────────────────────────────────────────────────┐
                              │            CANONICAL POSTGRESQL TELEMETRY              │
                              │  (development_events, sessions, event_analyses, etc.)  │
                              └───────────────────────────┬────────────────────────────┘
                                                          │
                    ┌─────────────────────────────────────┼─────────────────────────────────────┐
                    ▼                                     ▼                                     ▼
      ┌───────────────────────────┐         ┌───────────────────────────┐         ┌───────────────────────────┐
      │   Security Intelligence   │         │    Project Intelligence   │         │  Predictive Intelligence  │
      │  get_or_create_security_  │         │  get_project_intelligence │         │  get_or_create_predictive_│
      │        intelligence       │         │    get_engineering_dna    │         │        intelligence       │
      └─────────────┬─────────────┘         └─────────────┬─────────────┘         └─────────────┬─────────────┘
                    │                                     │                                     │
                    └─────────────────────────────────────┼─────────────────────────────────────┘
                                                          ▼
                                            ┌───────────────────────────┐
                                            │  Investigation 3.0 Engine │
                                            │  reconstruct_incident_    │
                                            │        investigation      │
                                            │ calculate_incident_metrics│
                                            └─────────────┬─────────────┘
                                                          ▼
                                            ┌───────────────────────────┐
                                            │   SPRINT 7 HEALTH &       │
                                            │  PRIORITY ORCHESTRATOR    │
                                            │ (apps/api/app/features/   │
                                            │      project_health)      │
                                            └───────────────────────────┘
```

### Exact Reusable Functions:

1. **Security Risk**: `get_or_create_security_intelligence()` (`security_intelligence/service.py`)
2. **Incident Load & Triage**: `calculate_incident_metrics()` & `get_incident_review_history()` (`investigation/service.py`)
3. **Engineering Velocity & Stability**: `get_project_intelligence()` (`projects/service.py`) & `get_engineering_dna()` (`engineering_dna/service.py`)
4. **Predictive Signals & Hotspots**: `get_or_create_predictive_intelligence()` (`predictive_intelligence/service.py`)
5. **Secret Redaction**: `redact_sensitive_text()` (`project_context/export.py`)
6. **Subsystem Classification**: `classify_subsystem()` (`predictive_intelligence/providers.py`)

---

## 5. Unified Project Health Model & Five Dimensions

### Health Score Scale (0 to 100)

- **`90 - 100`**: `EXCELLENT` — High stability, no critical findings, zero open high incidents, low forecast risk.
- **`75 - 89`**: `HEALTHY` — Normal active development, well-managed risks, active resolutions.
- **`60 - 74`**: `NEEDS_ATTENTION` — Unresolved medium/high incidents or emerging hotspots.
- **`40 - 59`**: `DEGRADED` — Multiple unmitigated security findings or active resolution regressions.
- **`0 - 39`**: `CRITICAL` — Active critical incidents, high blast radius, severe security posture risk.

### Five Deterministic Health Dimensions

$$\text{Overall Health Score} = \sum_{i=1}^5 \left( w_i \times \text{Dimension Score}_i \right)$$

| Dimension                     | Weight ($w_i$) | Formulation / Reused Canonical Source                                                                         | Key Contributing Signals                                                    |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **1. Security Health**        | 25%            | $100 - \text{SecurityRiskScore}$ (bounded 0–100) from `SecurityIntelligenceRead.risk_explanation.total_score` | Critical/High findings count, sensitive file exposures, AST guardian alerts |
| **2. Engineering Stability**  | 20%            | Derived from `ProjectIntelligence` activity series, modification burst stability, and file churn              | Event distribution, session continuity, language ecosystem consistency      |
| **3. Incident Health**        | 20%            | $100 - (\text{open\_critical} \times 35 + \text{open\_high} \times 20 + \text{open\_med} \times 10)$          | Active triage load from `IncidentMetrics`, unreviewed incident severity     |
| **4. Resolution Health**      | 15%            | $\text{ResolutionRate}\% \times 0.6 + (100 - \text{RegressionPenalty}) \times 0.4$                            | Percentage of triaged incidents resolved, absence of recurring regressions  |
| **5. Predictive Risk Health** | 20%            | $100 - \max(\text{TopForecastScores})$ from `PredictiveSummary`                                               | High-strength forecasts, hotspot score severity, focus drift volatility     |

### Insufficient Evidence State

When total telemetry is below baseline ($<2$ events, no sessions, no findings):

- Returns `status="INSUFFICIENT_EVIDENCE"`
- Overall Health Score: `null` (or 100 baseline with `INSUFFICIENT_EVIDENCE` flag)
- Explanation: _"Insufficient historical telemetry to determine project health. Ingest development activity to establish baseline."_

---

## 6. Deterministic Priority Engine ("What Should I Do Next?")

The Priority Engine evaluates all existing operational items and ranks them deterministically:

$$\text{Priority Rank Score} = \text{Severity Weight} + \text{Evidence Strength Weight} + \text{Recurrence/Regression Bonus}$$

### Priority Categories:

1. **`REGRESSION_ALERT`** (Rank 90–100): Previously resolved security rule reappeared in recent events.
2. **`CRITICAL_INCIDENT`** (Rank 80–95): Open critical severity incident affecting sensitive surface.
3. **`SECURITY_REMEDIATION`** (Rank 70–85): Unmitigated AST security finding (e.g. `SEC001`, `DEBUG_TRUE`).
4. **`HOTSPOT_REVIEW`** (Rank 50–75): High-velocity engineering hotspot with concentrated changes.
5. **`PREDICTIVE_PREVENTION`** (Rank 45–70): Imminent recurrence or activity acceleration forecast.

### Priority Item Schema:

```json
{
  "priority_id": "prio-98a12",
  "rank": 1,
  "category": "REGRESSION_ALERT",
  "title": "Resolve SEC001 Regression in config/vault.py",
  "severity": "CRITICAL",
  "score_contribution": 94,
  "affected_subsystems": ["Configuration & Environment"],
  "affected_files": ["config/vault.py"],
  "why_ranked_highly": "Prior resolution was recorded in review audit history, but rule SEC001 reappeared in recent telemetry.",
  "contributing_evidence": [
    "Resolution recorded by SecOps on Aug 19",
    "Finding SEC001 re-detected on Aug 21 in config/vault.py",
    "Sensitive surface touch: vault configuration file"
  ],
  "recommended_action": "Verify credentials externalization in vault.py and ensure CI pre-commit guard is active.",
  "deep_link_url": "/projects/5a6f468b-2b0e-4a1e-9d16-a7c10abdb403/investigation",
  "provenance": "OBSERVED"
}
```

---

## 7. Unified Project Health REST API Design

### Proposed Endpoints under `/api/projects/{project_id}/health`:

1. `GET /api/projects/{project_id}/health`
   - Returns full `UnifiedProjectHealth` model (overall score, grade, 5 dimensions, summary metrics, top priorities).
2. `GET /api/projects/{project_id}/health/priorities`
   - Returns ranked `list[ProjectPriorityItem]` with full rationale and deep links.
3. `POST /api/projects/{project_id}/health/refresh`
   - Forces re-aggregation and cache recalculation.

---

## 8. Dashboard Integration Design

### UI Placement:

The Unified Project Health is the **crown jewel of the Project Overview (`ProjectStoryPage.tsx`)**:

1. **Hero Health Banner**:
   - Circular/radial health score gauge with status badge (`HEALTHY`, `NEEDS_ATTENTION`, `CRITICAL`).
   - Quick dimension breakdown bar (Security, Stability, Incidents, Resolution, Predictive).
2. **"What Should I Do Next?" Action Center**:
   - Ranked priority action cards directly on the Project page.
   - 1-click navigation to Investigation Engine, Security Center, or Predictive Center.
3. **Dedicated Tab / View**:
   - Allows drilling down into each of the 5 health dimensions with full evidence breakdown.

---

## 9. Reconstructibility & Security Proof

1. **Reconstructibility ($A \equiv B$)**:
   - Querying Project Health generates Result A.
   - Derived caches cleared.
   - Re-querying Project Health produces Result B.
   - Semantic comparison proves $A \equiv B$.
   - Human review decisions in `incident_review_states` and `incident_review_history` remain intact as authoritative inputs.
2. **Strict Secret Redaction**:
   - All summaries, explanations, file diffs, and evidence lists are processed through `redact_sensitive_text()`.
   - Test string `VIBEPULSE_SPRINT7_SECRET_2026` must NEVER appear in raw form.

---

## 10. Verification & Test Plan

1. **Unit & Integration Tests (`apps/api/tests/test_project_health.py`)**:
   - Insufficient evidence state verification.
   - 5 health dimensions calculation and score bounding (0–100).
   - Priority engine ranking order verification.
   - Reconstructibility proof ($A \equiv B$).
   - Multi-project isolation.
   - Secret redaction test.
   - REST API endpoints.
2. **End-to-End Acceptance Test (`scripts/test-project-health-e2e.mjs`)**:
   - Full lifecycle test creating projects, ingesting telemetry, verifying health dimensions, asserting priorities, testing secret masking, and clean teardown.
3. **Monorepo Quality Gate**:
   - `pytest` across all 330+ backend tests.
   - `pnpm typecheck` (0 errors).
   - `pnpm lint` (0 errors).
   - `daemon test` (130 tests passed).
