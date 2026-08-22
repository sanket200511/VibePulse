# Engineering Knowledge Graph & Project Memory 2.0

> **Sprint 10 Deliverable — VibePulse Observability Platform**  
> _Central Principle: "What Does VibePulse Know About This Project, and How Are Its Parts Connected?"_

---

## 1. Overview & Architectural Role

The **Engineering Knowledge Graph & Project Memory 2.0** layer represents the culmination of VibePulse's canonical intelligence pipeline:

```mermaid
graph LR
  OBSERVE --> DETECT
  DETECT --> INVESTIGATE
  INVESTIGATE --> RESOLVE
  RESOLVE --> LEARN
  LEARN --> ANTICIPATE
  ANTICIPATE --> HEALTH
  HEALTH --> EXPLAIN
  EXPLAIN --> KNOWLEDGE_GRAPH
```

### Core Invariants

1. **Single Source of Truth**: PostgreSQL historical telemetry (`development_events`, `sessions`, `event_analyses`, `incident_review_states`, `incident_review_history`, `project_contexts`) remains the **only** canonical authority.
2. **Deterministic Derived Projection**: The graph is a pure projection calculated on-demand ($A \equiv B$). No shadow database or duplicate tables.
3. **Strict Relationship Semantics**: Edges explicitly model proven engineering relationships (`CONTAINS`, `BELONGS_TO`, `MODIFIED_IN`, `ASSOCIATED_WITH`, `CONTRIBUTED_TO`, `AFFECTS`, `RESOLVED_BY`, `CONTRIBUTES_TO`, `SUPPORTS`, `USED_BY`, `DERIVED_FROM`).
4. **Zero Raw Secret Exposure**: Sensitive tokens (such as `VIBEPULSE_SPRINT10_SECRET_2026`) are strictly masked to `[REDACTED]` across nodes, edges, file views, memory summaries, and markdown exports.
5. **Multi-Project Isolation**: Telemetry and graph entities from Project A never leak into Project B.

---

## 2. Semantic Node & Edge Taxonomy

Rather than rendering hundreds of raw individual file events as discrete nodes, VibePulse builds a **high-signal semantic engineering graph**:

| Node Type         | Description                                               | Key Metadata                                                |
| :---------------- | :-------------------------------------------------------- | :---------------------------------------------------------- |
| `Project`         | Root project entity                                       | Root path, display name, registered date                    |
| `Subsystem`       | Functional component (e.g. Authentication, Database, API) | File count, activity count, risk status                     |
| `File`            | Aggregated source file entity                             | Language, activity count, findings, incidents               |
| `Technology`      | Language ecosystem (e.g. Python, TypeScript)              | File count                                                  |
| `SecurityFinding` | AST-verified vulnerability or policy violation            | Rule ID, severity, risk contribution, redacted evidence     |
| `Incident`        | Correlated incident grouping related findings             | Status, severity, risk score, affected subsystem            |
| `Prediction`      | Evidence-backed forecast signal                           | Prediction type, forecast score, horizon, preventive action |
| `Resolution`      | Durable incident triage and review decision               | Status transition, reviewer, resolution note                |
| `Session`         | Development activity session                              | Status, event count, started at                             |
| `HealthDimension` | 5 health score dimensions                                 | Score (0-100), weight, status                               |

### Relationship Semantics

- `Project` --`CONTAINS`--> `Subsystem` / `Session` / `HealthDimension`
- `File` --`BELONGS_TO`--> `Subsystem`
- `File` --`MODIFIED_IN`--> `Session`
- `SecurityFinding` --`ASSOCIATED_WITH`--> `File`
- `SecurityFinding` --`CONTRIBUTED_TO`--> `Incident`
- `Incident` --`AFFECTS`--> `Subsystem`
- `Incident` --`RESOLVED_BY`--> `Resolution`
- `HealthDimension` --`CONTRIBUTES_TO`--> `Project`
- `Prediction` --`SUPPORTS`--> `Subsystem`
- `Technology` --`USED_BY`--> `Project`

---

## 3. Project Memory 2.0 (`PROJECT_CONTEXT.md` Section 20)

Project Memory 2.0 provides an AI-ready structured export that answers:

- What technologies, frameworks, and languages are in use?
- What are the high-activity hotspot files?
- What is the current health grade and score decomposition?
- What are the open incidents and recurring security rules?
- What are the known unknowns (gaps in observation)?

This data is integrated into Section 20 of `PROJECT_CONTEXT.md` on `/api/projects/{projectId}/context/export`.

---

## 4. REST API Endpoints

| Endpoint                                               | Method | Description                                            |
| :----------------------------------------------------- | :----- | :----------------------------------------------------- |
| `/api/projects/{id}/knowledge-graph`                   | `GET`  | Retrieve full derived Knowledge Graph projection       |
| `/api/projects/{id}/knowledge-graph/nodes`             | `GET`  | Query nodes with optional `node_type` filter           |
| `/api/projects/{id}/knowledge-graph/relationships`     | `GET`  | Query edges with optional `relationship_type` filter   |
| `/api/projects/{id}/knowledge-graph/files/{path}`      | `GET`  | File Intelligence view (activity, findings, incidents) |
| `/api/projects/{id}/knowledge-graph/subsystems/{name}` | `GET`  | Subsystem Intelligence view (risk posture, files)      |
| `/api/projects/{id}/knowledge-graph/memory`            | `GET`  | Project Memory 2.0 AI model payload                    |
| `/api/projects/{id}/knowledge-graph/search?q=...`      | `GET`  | Multi-entity deterministic graph search                |
| `/api/projects/{id}/knowledge-graph/refresh`           | `POST` | Deterministically invalidate cache and recompute       |

---

## 5. Frontend Dashboard

The Knowledge Graph UI is available at:
`http://localhost:5134/projects/:projectId/knowledge-graph`

Features:

- **Subsystem & Node Type Filtering**: Instant filtering by subsystem or entity category.
- **Entity Search Bar**: Search across files, rules, and subsystems.
- **Node & Edge Details Drawer**: Deep drill-downs with activity stats, findings, and triage notes.
- **Evidence Inspector Integration**: Direct `[Why?]` triggers that open the universal Evidence Inspector modal without code duplication.
