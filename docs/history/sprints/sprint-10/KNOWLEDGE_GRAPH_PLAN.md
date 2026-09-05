# DepRadar Sprint 10 — Engineering Knowledge Graph & Project Memory 2.0 Plan

## 1. Executive Mission

Extend DepRadar from:

$$\mathbf{OBSERVE \longrightarrow DETECT \longrightarrow INVESTIGATE \longrightarrow RESOLVE \longrightarrow LEARN \longrightarrow ANTICIPATE \longrightarrow HEALTH \longrightarrow EXPLAIN}$$

Into:

$$\mathbf{OBSERVE \longrightarrow DETECT \longrightarrow INVESTIGATE \longrightarrow RESOLVE \longrightarrow LEARN \longrightarrow ANTICIPATE \longrightarrow HEALTH \longrightarrow EXPLAIN \longrightarrow CONNECT}$$

Answering the foundational engineering question:
$$\mathbf{"\text{WHAT DOES VIBEPULSE KNOW ABOUT THIS PROJECT, AND HOW ARE ITS PARTS CONNECTED?}"}$$

---

## 2. Invariant Rules & Guarantees

1. **Authoritative Source of Truth**: PostgreSQL immutable historical telemetry (`development_events`, `sessions`, `event_analyses`, `incident_review_states`, `incident_review_history`, `project_contexts`).
2. **Derived Projection**: The Engineering Knowledge Graph is a 100% deterministic relationship projection ($A \equiv B$). No duplicate source of truth.
3. **No Duplicate Engines**: Reuses existing Security Guardian, Project Context Memory, Engineering DNA, Investigation 3.0, Predictive Intelligence, Unified Health, and Evidence Intelligence.
4. **No LLM or Embeddings**: Graph queries and semantic relationship traversals are pure, deterministic graph algorithms.
5. **Multi-Project Isolation**: Graphs are strictly isolated by project ID and root path.
6. **Secret Safety**: Strict `[REDACTED]` masking across nodes, edges, search results, exports, and UI.

---

## 3. Graph Schema: Nodes & Relationships

### Nodes

- **`Project`**: Root entity (ID, display name, root path).
- **`Subsystem`**: Domain cluster (e.g. `Authentication`, `Configuration`, `Database`, `Payments`, `Core Application`).
- **`Directory`**: Structural directory node.
- **`File`**: Observed source/config file (path, language, activity count).
- **`Technology` / `Framework`**: Verified project tech stack.
- **`SecurityFinding`**: Active or historical AST violation (`SEC001`, `DEBUG_TRUE`).
- **`Incident`**: Correlated security/operational incident.
- **`Prediction`**: Recurrence/hotspot forecast signal.
- **`Resolution`**: Recorded human review resolution.
- **`Session`**: Development work session.
- **`HealthDimension`**: Dimensional health score node.

### Relationships

- `(Project) -[CONTAINS]-> (Directory | File | Subsystem)`
- `(File) -[BELONGS_TO]-> (Subsystem | Directory)`
- `(File) -[MODIFIED_IN]-> (Session)`
- `(File) -[ASSOCIATED_WITH]-> (SecurityFinding)`
- `(SecurityFinding) -[CONTRIBUTED_TO]-> (Incident)`
- `(Incident) -[AFFECTS]-> (Subsystem)`
- `(Incident) -[RESOLVED_BY]-> (Resolution)`
- `(Incident) -[CONTRIBUTES_TO]-> (HealthDimension)`
- `(File) -[SUPPORTS]-> (Prediction)`
- `(Technology) -[USED_BY]-> (Project)`

---

## 4. Endpoints & REST Architecture

- `GET /api/projects/{project_id}/knowledge-graph`: Full project graph (nodes + edges + metadata).
- `GET /api/projects/{project_id}/knowledge-graph/nodes`: Filterable node list.
- `GET /api/projects/{project_id}/knowledge-graph/relationships`: Filterable edge list.
- `GET /api/projects/{project_id}/knowledge-graph/files/{path}`: File intelligence detail.
- `GET /api/projects/{project_id}/knowledge-graph/subsystems/{name}`: Subsystem intelligence detail.
- `GET /api/projects/{project_id}/knowledge-graph/incidents/{incident_id}`: Incident relationship view.
- `GET /api/projects/{project_id}/knowledge-graph/memory`: Project Memory 2.0 structured memory view.
- `GET /api/projects/{project_id}/knowledge-graph/search?q=...`: Deterministic multi-entity search.
- `POST /api/projects/{project_id}/knowledge-graph/refresh`: Reconstructs graph projection from PostgreSQL.

---

## 5. UI: Interactive Knowledge Graph Dashboard

- Route: `/projects/:projectId/knowledge-graph`
- Interactive SVG/Canvas/DOM graph layout with Subsystem grouping, File nodes, Security Findings, Incidents, Predictions, and Resolutions.
- Features: Zoom, Pan, Fit to Screen, Search, Filter by Subsystem / Node Type, Node Details drawer, Edge Evidence Inspector link ("Why does this relationship exist?").
