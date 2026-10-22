# VibePulse API Reference

**Status**: Authoritative API Reference
**Base URL**: `http://localhost:5184`
**Interactive OpenAPI Docs**: `http://localhost:5184/docs`

---

## 1. Projects API

### `POST /api/projects`

Ensures or registers a project workspace on disk. Idempotent.

- **Request**: `{"root_path": "D:\\Projects\\App", "display_name": "App"}`
- **Response**: `200 OK` with `ProjectRead` object.

### `GET /api/projects`

Lists all registered project workspaces with active session count and status.

### `GET /api/projects/{project_id}`

Retrieves a specific project by UUID.

### `DELETE /api/projects/{project_id}`

Safely deletes a project from VibePulse. Cascades deletion strictly to internal database records; physical files on disk remain untouched.

---

## 2. Telemetry Ingestion & Sessions

### `POST /events`

Ingests raw development events from the telemetry daemon (`5185`). Deduplicated on `(session_id, file_path, event_type, timestamp)`.

### `GET /events`

Retrieves recent development events, newest first.

### `GET /sessions`

Retrieves development sessions (`ACTIVE`, `IDLE`, `COMPLETED`).

### `GET /sessions/current`

Retrieves the currently active session.

---

## 3. Security Intelligence 2.0

### `GET /api/projects/{project_id}/security`

Computes the security posture and AST rule findings (`SEC001`, `DEBUG_TRUE`, credential leaks). All sensitive tokens are masked to `[REDACTED]`.

---

## 4. Investigation & Incident Resolution 3.0

### `GET /api/investigation/search`

Faceted search over correlated incidents across all observed projects.

### `GET /api/projects/{project_id}/investigations/{incident_id}`

Retrieves the causal DAG evidence graph, score breakdown ($W_i \times S_i$), and root cause narrative for an incident.

### `POST /api/projects/{project_id}/investigations/{incident_id}/review`

Updates the review state (`OPEN` $\to$ `INVESTIGATING` $\to$ `MITIGATING` $\to$ `REVIEWED` $\to$ `RESOLVED` $\to$ `FALSE_POSITIVE`) with reviewer attribution and triage notes.

### `GET /api/projects/{project_id}/investigations/{incident_id}/history`

Fetches the immutable lifecycle transition audit history for an incident.

---

## 5. Unified Project Health & Metric Triad

### `GET /api/projects/{project_id}/health`

Returns the Metric Triad (`Overall Health Score`, `Security Risk Score`, `Forecast Strength`), 5-dimension score breakdown, and prioritized action recommendations.

### `POST /api/projects/{project_id}/health/refresh`

Deterministically recomputes health state from current PostgreSQL ground truth.

---

## 6. Predictive Engineering Intelligence

### `GET /api/projects/{project_id}/predictions`

Returns time-series code churn velocity trends, modification acceleration slope, directory focus drift, and regression risk forecasts.

---

## 7. Engineering Knowledge Graph & Project Memory 2.0

### `GET /api/projects/{project_id}/knowledge-graph`

Materializes the semantic multi-entity graph (`FILE`, `SUBSYSTEM`, `SECURITY_RULE`, `INCIDENT`, `SESSION`).

### `GET /api/projects/{project_id}/knowledge-graph/search?q={query}`

Multi-entity deterministic graph search across files, rules, and subsystems.

### `GET /api/projects/{project_id}/context/export`

Exports portable `PROJECT_CONTEXT.md` containing ground truth state for AI agent handoffs.

---

## 8. AI Engineering Copilot Foundation

### `POST /api/projects/{project_id}/copilot/query`

Evaluates natural engineering queries across 16 canonical query families with grounded tri-state facts (`[OBSERVED]`, `[INFERRED]`, `[UNKNOWN]`) and Answerability Gate.

- **Request**: `{"query": "What is the health of this project?"}`
- **Response**: `{"query_family": "PROJECT_HEALTH", "provenance": "INFERRED", "answer": "...", "confidence": 1.0}`

---

## 9. Real-Time WebSockets

- `ws://localhost:5184/ws/events`: Live raw event broadcast stream.
- `ws://localhost:5184/ws/sessions`: Live session state transition broadcast stream.
