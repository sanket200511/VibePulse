# Investigation Engine 3.0 — Unified Incident Intelligence

## 1. Overview & Objective

Investigation Engine 3.0 upgrades VibePulse from a basic query tool ("show suspicious events") into a **Unified Incident Intelligence Layer** that reconstructs and explains the complete story of a development incident.

It deterministically answers:

1. **WHAT** happened?
2. **WHEN** did it happen?
3. **WHERE** did it happen (subsystem & files)?
4. **WHICH SESSION** was involved?
5. **WHY** was it considered significant?
6. **WHAT OTHER EVENTS** were related?
7. **HOW** did the composite risk evolve?
8. **DID THIS BEHAVIOR DEVIATE** from the project's normal Engineering DNA?
9. **WHAT EVIDENCE** supports the conclusion?
10. **WHAT ACTION** should the developer take next?

---

## 2. Architecture & Data Flow

```
Observation Engine (Filesystem Telemetry)
         ↓
PostgreSQL (development_events, sessions)  <-- Canonical Source of Truth
         ↓
Event-Level Analysis (event_analyses)
         ↓
Security Intelligence 2.0 (Projection)
         ↓
Project Context Memory & Engineering DNA (Projection)
         ↓
Investigation Engine 3.0 (Unified Orchestration)
 ├── Incident Story (Facts-derived narrative)
 ├── Timeline 3.0 (Telemetry timestamps)
 ├── Risk Evolution (Additive point stepper)
 ├── Root Cause & Contributing Signals
 ├── Engineering DNA Contrast
 ├── Affected Surface Breakdown
 ├── Evidence Graph 3.0 (Typed nodes & causal edges)
 ├── Review Lifecycle (OPEN -> INVESTIGATING -> REVIEWED -> RESOLVED)
 └── Multi-Format Exports (Markdown, JSON, AI Handoff)
```

---

## 3. Reused Core Components

Per the Sprint 4 Safety Gate, duplicate subsystems were strictly avoided:

- **Shared Risk Formula**: Reuses `compute_risk_explanation` from `security_intelligence/correlator.py`.
- **Incident Correlation**: Reuses `correlate_security_incidents` from `security_intelligence/correlator.py`.
- **Project Intelligence**: Reuses `get_or_create_project_context` from `project_context/service.py`.
- **Engineering DNA**: Reuses `get_engineering_dna` from `engineering_dna/service.py`.
- **Secret Redaction**: Reuses `redact_sensitive_text`, `redact_assignment`, and `redact_sensitive_line`.

---

## 4. Evidence Graph 3.0 Topology

Every node in Evidence Graph 3.0 maps to a concrete telemetry observation:

- `SESSION`: Developer session initialization
- `FILE_CHANGE`: Filesystem mutation event
- `SECURITY_FINDING`: Security Guardian pattern match (`SEC001`, `DEBUG_TRUE`, etc.)
- `ENGINEERING_DNA`: Repository structural baseline contrast
- `RISK_CHANGE`: Risk evolution milestone
- `CORRELATED_INCIDENT`: Unified incident synthesis
- `REMEDIATION`: Prescribed developer action

Every edge represents an explainable relationship:

- `modified during session`
- `triggered analyzer rule`
- `evaluated against DNA baseline`
- `contributed to composite risk`
- `aggregated into incident`
- `requires remediation`

---

## 5. Review Lifecycle Persistence

User decisions and review states are separated from derived facts and persisted in PostgreSQL table `incident_review_states`:

- `status`: `OPEN` $\rightarrow$ `INVESTIGATING` $\rightarrow$ `REVIEWED` $\rightarrow$ `RESOLVED`
- `reviewed_by`: Identity of the engineer/auditor
- `reviewed_at`: Timestamp of review
- `resolution_note`: Freeform remediation documentation
- `resolved_at`: Resolution timestamp

---

## 6. Strict Secret Redaction Invariant

Raw secrets (e.g. `VIBEPULSE_INVESTIGATION_SECRET_2026`, API keys, bearer tokens) are never persisted, stored in graphs, exported, or displayed. They are consistently masked to `[REDACTED]`.

---

## 7. Reconstructibility Verification

Investigation data is a derived projection over PostgreSQL telemetry. Clearing derived review state or rebuilding across service restarts produces identical results with 100% semantic fidelity.
