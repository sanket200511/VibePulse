# VibePulse Correlation & Causality Graph — Implementation Report

**Implementation Date:** 2026-08-25  
**Version:** VibePulse 2.0 Semantic Core  
**Canonical Stack Ports:** Dashboard `:5183` | API `:5184` | Daemon `:5185` | PostgreSQL `:5432`  
**Target Scenario:** `VibePulse-Seminar-Demo` (`334351d3-4aeb-4bc4-9387-f22e236acda8`)

---

## 1. Executive Summary

The VibePulse Knowledge Graph has been upgraded into a production-grade **Correlation & Causality Graph**. The system delivers end-to-end causal traceability across the engineering lifecycle:

$$\text{OBSERVED EVENT} \longrightarrow \text{FINDING} \longrightarrow \text{INCIDENT} \longrightarrow \text{ROOT CAUSE} \longrightarrow \text{HEALTH IMPACT} \longrightarrow \text{RESOLUTION} \longrightarrow \text{PREDICTION} \longrightarrow \text{PROJECT MEMORY}$$

Every node and edge is grounded directly in PostgreSQL historical ground truth (`development_events`, `event_analyses`, `sessions`, `projects`, `incident_review_states`, `incident_review_history`, `project_contexts`). No speculative, fake, or synthetic telemetry is used.

---

## 2. Architecture & Domain Model

### 2.1 Node Hierarchy

| Node Type          | Source Table / Projection       | Semantic Role                                                         | Provenance |
| :----------------- | :------------------------------ | :-------------------------------------------------------------------- | :--------- |
| `Project`          | `projects`                      | Root project entity & composite health posture                        | `OBSERVED` |
| `Subsystem`        | Path classifier pattern         | Architectural boundary (e.g. Authentication, Configuration, Database) | `OBSERVED` |
| `File`             | `development_events`            | Observed source file entity with event count                          | `OBSERVED` |
| `DevelopmentEvent` | `development_events`            | Granular modification or AST telemetry event with timestamp           | `OBSERVED` |
| `SecurityFinding`  | `compute_security_intelligence` | AST security rule violation (e.g. SEC001 hardcoded credential)        | `OBSERVED` |
| `RootCause`        | `get_incident_detail_3`         | Underlying causal vulnerability triggering an incident                | `OBSERVED` |
| `Incident`         | `incident_review_states`        | Correlated security or stability incident                             | `OBSERVED` |
| `Resolution`       | `incident_review_history`       | Review audit transition with note and reviewer sign-off               | `OBSERVED` |
| `Actor`            | `incident_review_history`       | Engineer or reviewer who executed triage/remediation                  | `OBSERVED` |
| `HealthDimension`  | `project_health`                | 5-Dimension score decomposition (Security, Stability, Incident, etc.) | `INFERRED` |
| `Prediction`       | `predictive_intelligence`       | Forward forecast signal with evidence strength                        | `INFERRED` |
| `Technology`       | `project_contexts`              | Detected programming languages and framework dependencies             | `OBSERVED` |

### 2.2 Relationship Types

| Relationship Type  | Source Node $\to$ Target Node                    | Grounded Reason / Evidence                           |
| :----------------- | :----------------------------------------------- | :--------------------------------------------------- |
| `MODIFIED`         | `DevelopmentEvent` $\to$ `File`                  | Verified telemetry event timestamp and file path     |
| `CONTAINS_FINDING` | `File` $\to$ `SecurityFinding`                   | AST Guardian detection with exact line number        |
| `CONTRIBUTED_TO`   | `SecurityFinding` $\to$ `RootCause` / `Incident` | Risk contribution point accumulation                 |
| `CAUSED`           | `RootCause` $\to$ `Incident`                     | Root cause vulnerability trigger                     |
| `RESOLVED_BY`      | `Incident` $\to$ `Resolution`                    | PostgreSQL transition audit record                   |
| `INVESTIGATED_BY`  | `Actor` $\to$ `Resolution`                       | Verified reviewer signature in review history        |
| `AFFECTS`          | `Incident` $\to$ `HealthDimension`               | Degradation of Security or Incident health dimension |
| `CONTRIBUTES_TO`   | `HealthDimension` $\to$ `Project`                | Mathematical score weighting ($W_i \times S_i$)      |
| `PREDICTED_AS`     | `File` $\to$ `Prediction`                        | Velocity and AST risk concentration                  |
| `BELONGS_TO`       | `File` $\to$ `Subsystem`                         | Architectural path boundary matching                 |
| `CONTAINS`         | `Project` $\to$ `Subsystem`                      | Subsystem boundary registration                      |
| `USED_BY`          | `Technology` $\to$ `Project`                     | Language detection in project context                |

---

## 3. Core Graph Intelligence Engines

### 3.1 Trace Root Cause (Backward Walk)

Walks backward through grounded edges:
$$\text{Project Health} \longleftarrow \text{Security Health} \longleftarrow \text{Incident} \longleftarrow \text{Root Cause} \longleftarrow \text{Security Finding (SEC001)} \longleftarrow \text{File (settings.py)} \longleftarrow \text{Event}$$

- Returns step-by-step traversal with evidence references and terminal stopping condition.

### 3.2 Trace Impact (Forward Walk)

Walks forward through downstream causal paths:
$$\text{Development Event / File} \longrightarrow \text{Security Finding} \longrightarrow \text{Incident} \longrightarrow \text{Health Dimension} \longrightarrow \text{Project} \longrightarrow \text{Prediction}$$

- Returns direct & downstream impacts, affected subsystems, and forecast risk warnings.

### 3.3 Evidence-Backed Relationship Explanations

Every edge provides an explanation payload answering:

- **Why is this connected?** (Grounded reason synthesized from AST AST rules and risk models)
- **Evidence References** (Finding IDs, incident IDs, source file paths)
- **Graceful Fallback**: If evidence is insufficient, returns `"Insufficient evidence to establish this relationship in PostgreSQL telemetry."`

### 3.4 Chronological Timeline & Before/After Comparison

- **Timeline**: Chronological sequence of all events with verified timestamps.
- **Before / After**: Side-by-side posture comparison showing pre-remediation vulnerability vs post-remediation verified resolution audit.

---

## 4. API Endpoints

| Method | Endpoint                                                    | Description                                    |
| :----- | :---------------------------------------------------------- | :--------------------------------------------- |
| `GET`  | `/api/projects/{id}/knowledge-graph`                        | Full correlation & causality graph projection  |
| `GET`  | `/api/projects/{id}/knowledge-graph/nodes`                  | Filterable graph nodes (by type or subsystem)  |
| `GET`  | `/api/projects/{id}/knowledge-graph/relationships`          | Filterable graph relationships                 |
| `GET`  | `/api/projects/{id}/knowledge-graph/edges/{rel_id}/explain` | Grounded edge explanation and evidence         |
| `GET`  | `/api/projects/{id}/knowledge-graph/trace/root-cause`       | Backward root cause traversal                  |
| `GET`  | `/api/projects/{id}/knowledge-graph/trace/impact`           | Forward downstream impact traversal            |
| `GET`  | `/api/projects/{id}/knowledge-graph/timeline`               | Chronological event timeline                   |
| `GET`  | `/api/projects/{id}/knowledge-graph/before-after`           | Before vs after remediation posture comparison |
| `GET`  | `/api/projects/{id}/knowledge-graph/files/{path}`           | File-centric intelligence view                 |
| `GET`  | `/api/projects/{id}/knowledge-graph/subsystems/{sub}`       | Subsystem intelligence view                    |
| `GET`  | `/api/projects/{id}/knowledge-graph/memory`                 | Project Memory 2.0 AI context model            |
| `GET`  | `/api/projects/{id}/knowledge-graph/search`                 | Multi-entity deterministic graph search        |
| `POST` | `/api/projects/{id}/knowledge-graph/refresh`                | Force re-projection from PostgreSQL            |

---

## 5. Security & Isolation Verification

1. **Strict Secret Redaction**:
   - `_mask_secret` guarantees that credentials (`VIBEPULSE_*`, `sk-*`, `vlt_*`, raw API keys) are replaced with `[REDACTED]` across all node labels, edge reasons, metadata, and JSON exports.
2. **Multi-Project Isolation**:
   - All queries filter strictly by `project_id` and normalized `project_root`. Project A entities cannot appear in Project B.
3. **Deterministic Reconstructibility**:
   - Clearing cache and re-projecting produces identical graph nodes, edge counts, and traversal results.

---

## 6. Acceptance & Quality Gates Verification

| Verification Suite                      | Result                    | Status                |
| :-------------------------------------- | :------------------------ | :-------------------- |
| **Backend Pytest (`apps/api/tests`)**   | **352 / 352 PASSED**      | **100% GREEN**        |
| **Daemon Vitest (`apps/daemon`)**       | **130 / 130 PASSED**      | **100% GREEN**        |
| **Dashboard Vitest (`apps/dashboard`)** | **PASSED**                | **100% GREEN**        |
| **TypeScript Monorepo Typecheck**       | **5 / 5 PACKAGES PASSED** | **0 ERRORS**          |
| **Seminar Doctor Live Audit**           | **ALL CHECKS PASSED**     | **READY FOR SEMINAR** |
