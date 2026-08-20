# Project Context Memory & Intelligence Architecture

## 1. Overview

**Project Context Memory** is VibePulse's durable, evidence-backed knowledge layer that operates across development sessions and application restarts.

```
┌────────────────────────────────────────────────────────┐
│                   EVENT HISTORY                        │
│   (Real file creations, edits, diffs, commits)         │
└───────────────────────────┬────────────────────────────┘
                            │ aggregated into
                            ▼
┌────────────────────────────────────────────────────────┐
│                  SESSION HISTORY                       │
│   (Continuous development sessions & workflows)        │
└───────────────────────────┬────────────────────────────┘
                            │ synthesized into
                            ▼
┌────────────────────────────────────────────────────────┐
│               PROJECT CONTEXT MEMORY                   │
│   (Durable `project_contexts` PostgreSQL table)        │
│   - Languages & Frameworks (with exact provenance)     │
│   - Key Architectural & Config Artifacts               │
│   - Dominant Engineering Patterns (API, UI, Auth, DB)  │
│   - Cumulative Security & Activity Metrics             │
└───────────────────────────┬────────────────────────────┘
                            │ context for
                            ▼
┌────────────────────────────────────────────────────────┐
│             INVESTIGATION & GUARDIAN                   │
│   (Security anomalies assessed in true project context)│
└────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Principles

1. **Durable PostgreSQL Persistence**:
   - Stored in the dedicated `project_contexts` table with a unique `project_id` foreign key cascade.
   - Survives all daemon, API server, and browser restarts.

2. **Deterministic Evidence Provenance**:
   - Zero fabricated intelligence or hallucinated metrics.
   - Every detected framework, technology, and package manager links back to exact file paths and code artifacts observed during development.

3. **Multi-Project Isolation**:
   - Each project maintains a dedicated context row.
   - Telemetry from Project A is strictly isolated from Project B.

4. **Security & Redaction Invariant**:
   - Hardcoded secrets and sensitive tokens are never stored in plain text within project contexts.
   - Only structural metadata and rule classifications are aggregated.

5. **Future AI/ML Extension Points**:
   - The schema is designed with structured JSONB columns (`languages`, `frameworks`, `technologies`, `development_patterns`, `security_summary`, `architecture_summary`), enabling future offline or local embedding models to augment summaries without schema migrations.

---

## 3. Database Schema (`project_contexts`)

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique identifier for the context record. |
| `project_id` | `UUID` (FK, Unique, Indexed) | References `projects.id` with `CASCADE` delete. |
| `languages` | `JSONB` | Distribution of languages by event count and percentage. |
| `frameworks` | `JSONB` | Array of detected frameworks with evidence provenance. |
| `technologies` | `JSONB` | Array of detected runtimes, databases, and tooling. |
| `package_managers` | `JSONB` | Detected dependency management tooling. |
| `important_files` | `JSONB` | Top observed files sorted by frequency and semantic role. |
| `configuration_files` | `JSONB` | Key configuration and manifest artifacts. |
| `test_directories` | `JSONB` | Discovered test suites and directory paths. |
| `source_directories` | `JSONB` | Discovered application source roots. |
| `git_context` | `JSONB` | Active git branch and tracked branches. |
| `development_patterns` | `JSONB` | Identified engineering focus areas (Auth, API, UI, DB, QA). |
| `security_summary` | `JSONB` | Cumulative risk counts and top triggered security rules. |
| `activity_summary` | `JSONB` | Total sessions, events, and observation windows. |
| `architecture_summary`| `JSONB` | Monorepo/workspace classification and modular topology. |
| `context_version` | `Integer` | Schema/aggregation version (default `1`). |
| `first_observed_at` | `DateTime(TZ)` | Earliest recorded telemetry timestamp. |
| `last_analyzed_at` | `DateTime(TZ)` | Timestamp of most recent context re-aggregation. |
| `created_at` | `DateTime(TZ)` | Record creation timestamp. |
| `updated_at` | `DateTime(TZ)` | Record update timestamp. |

---

## 4. API Endpoints

### `GET /api/projects/{project_id}/context`
Retrieves or lazily initializes the durable Project Context for the specified project.

### `POST /api/projects/{project_id}/context/refresh`
Forces an immediate re-aggregation of all project telemetry, persisting the updated intelligence state into PostgreSQL.

---

## 5. UI Integration

The **Project Context Memory** interface is rendered directly inside the Project Details view (`/projects/:id`), featuring:
- **Durable Intelligence Badge**: Shows PostgreSQL persistence state and last updated timestamp.
- **Language Breakdown**: Real distribution bars derived from observed file events.
- **Detected Frameworks & Tools**: Cards detailing name, category, and deterministic evidence provenance.
- **Observed Development Focus**: Pattern cards displaying evidence counts and sample files.
- **Key Project Artifacts**: Frequently modified files with activity counters.
- **Security Posture & Architecture Overview**: Real security counts and workspace topology.
- **Interactive Refresh**: On-demand re-sync action for live project updates.
