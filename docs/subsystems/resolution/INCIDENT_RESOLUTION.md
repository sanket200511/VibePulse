# Incident Collaboration & Resolution Intelligence 3.0

## 1. Architectural Overview

DepRadar Sprint 5 completes the developer security loop by extending the platform from:

$$\text{OBSERVE} \longrightarrow \text{DETECT} \longrightarrow \text{INVESTIGATE} \longrightarrow \text{RESOLVE} \longrightarrow \text{LEARN}$$

```
Filesystem Events
       │
       ▼
Observation Engine (Daemon)
       │
       ▼ (PostgreSQL authoritative source of truth)
development_events & sessions
       │
       ▼
Event Analysis & Security Intelligence 2.0
       │
       ▼
Unified Investigation Engine 3.0
       │
       ├── Evidence Graph 3.0 (Causal topology)
       ├── Incident Story & Risk Evolution (Deterministic projection)
       │
       ▼
Incident Collaboration & Resolution Intelligence
       ├── Incident Review Lifecycle (OPEN -> INVESTIGATING -> REVIEWED -> RESOLVED)
       ├── Immutable Audit History (incident_review_history)
       ├── Real-time Multi-tab Sync (WebSocket INCIDENT_REVIEW_UPDATED)
       ├── Resolution Recommendations & Verification Checklist
       ├── Incident Metrics & Mean Time to Resolution (MTTR)
       └── Project Security Health Summary
```

---

## 2. Review Lifecycle State Machine

The review workflow tracks the exact operational state of any detected incident:

| Status          | Meaning                                                                  | Permitted Transitions                   |
| --------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| `OPEN`          | Initial unassigned incident state detected from telemetry.               | `INVESTIGATING`, `REVIEWED`, `RESOLVED` |
| `INVESTIGATING` | Incident is under active inspection by a developer or security engineer. | `OPEN`, `REVIEWED`, `RESOLVED`          |
| `REVIEWED`      | Incident severity, findings, and affected files have been verified.      | `INVESTIGATING`, `RESOLVED`, `OPEN`     |
| `RESOLVED`      | Root cause remediated, credentials rotated, or configuration fixed.      | `INVESTIGATING`, `OPEN`, `REVIEWED`     |

Every state transition records an immutable audit history entry while updating the current snapshot state.

---

## 3. Database Schema & Migration

### `incident_review_history` Table

Applied in Alembic revision `0008_create_incident_review_history`:

```sql
CREATE TABLE incident_review_history (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    incident_id VARCHAR(255) NOT NULL,
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    resolution_note TEXT,
    reviewer VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_incident_review_history_project_id ON incident_review_history(project_id);
CREATE INDEX ix_incident_review_history_incident_id ON incident_review_history(incident_id);
```

---

## 4. Real-time Multi-Tab Synchronization

When a status change is saved via `POST /api/projects/{project_id}/investigations/{incident_id}/review`:

1. The API creates an immutable `IncidentReviewHistory` row.
2. The current `IncidentReviewState` snapshot is updated.
3. The WebSocket server broadcasts an `INCIDENT_REVIEW_UPDATED` event to all connected dashboard sessions:

```json
{
  "type": "INCIDENT_REVIEW_UPDATED",
  "project_id": "17ac2359-9956-4244-9102-903722a59555",
  "incident_id": "inc-sprint5-1",
  "status": "RESOLVED",
  "updated_at": "2026-08-21T06:59:47.858671Z"
}
```

_Security Invariant_: The WebSocket payload contains only metadata (project ID, incident ID, status, timestamp) and **never** includes raw secrets or sensitive evidence.

---

## 5. Resolution Intelligence Engine

DepRadar maps detected static and dynamic findings to evidence-backed remediation playbooks:

### Rule Mappings

- **`SEC001` / Hardcoded Secrets**:
  - _Title_: Rotate Exposed Credential & Externalize Secret
  - _Actions_: Revoke and rotate key upstream; externalize to `.env` or Secret Manager vault; remove raw string; re-scan file.
  - _Verification_: Inspect git diff; verify runtime application reads from environment.
- **`DEBUG_TRUE` / Insecure Debug Mode**:
  - _Title_: Disable Insecure Debug Mode
  - _Actions_: Set `DEBUG = False` in production configuration; enforce debug settings via environment variables.
  - _Verification_: Confirm debug mode is disabled for non-local builds.
- **`PERMISSIVE_CORS` / Wildcard Origins**:
  - _Title_: Restrict Cross-Origin Resource Sharing (CORS)
  - _Actions_: Replace wildcard `allow_origins` with explicit domain whitelist; disable `allow_credentials` on wildcards.
  - _Verification_: Send preflight OPTIONS request with untrusted origin to verify rejection.
- **`EVAL_USAGE` / Dynamic Execution**:
  - _Title_: Replace Dynamic Code Execution
  - _Actions_: Replace `eval()` or `exec()` with safe parsers (`ast.literal_eval`, `json.loads`); validate input data.
  - _Verification_: Verify static analysis passes with zero dynamic execution warnings.
- **`OS_SYSTEM` / Shell Command Injection**:
  - _Title_: Sanitize Shell Command Execution
  - _Actions_: Use parameterized subprocess execution (`subprocess.run(..., shell=False)`); validate and escape arguments.
  - _Verification_: Confirm process executions pass arguments as structured arrays.

---

## 6. Incident Metrics & Health Summary Calculation

Endpoints:

- `GET /api/projects/{project_id}/investigations/metrics`
- `GET /api/projects/{project_id}/investigations/health-summary`

### Metrics Computation:

- **Total Incidents**: Count of all correlated incidents for the project.
- **Open / Investigating / Resolved Counts**: Calculated from persisted `IncidentReviewState`.
- **Resolution Rate %**: $(\text{Resolved} / \text{Total}) \times 100$.
- **Mean Time to Resolution (MTTR)**: Average duration between incident discovery (`started_at`) and final resolution transition (`created_at` where `new_status == 'RESOLVED'`).
- If insufficient history exists: gracefully displays `"Insufficient historical data"`.

---

## 7. Strict Security & Isolation Invariants

1. **Zero Raw Secret Leakage**:
   - Secrets matching pattern `VIBEPULSE_SPRINT5_SECRET_2026` are masked to `[REDACTED]` before writing to DB, returning in API JSON, broadcasting over WebSockets, or rendering Markdown/AI handoff reports.
2. **Authoritative Telemetry & 100% Reconstructibility**:
   - Review history and review state are persisted directly in PostgreSQL. Investigation details can be safely recomputed at any time from telemetry events without losing triage decisions.
3. **Multi-Project Isolation & Cascading Cleanup**:
   - Queries for history, metrics, and health summaries are strictly filtered by `project_id`.
   - Deleting Project A removes all review history and states belonging to Project A without affecting Project B.
