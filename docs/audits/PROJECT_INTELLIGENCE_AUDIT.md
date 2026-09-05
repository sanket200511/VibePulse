# PX-8.0 Project Intelligence Architecture Audit

## Executive Verdict

READY WITH ARCHITECTURAL GAPS

The core telemetry (events and sessions) is highly detailed, deterministic, and securely models long-term chronological history. However, DepRadar lacks a canonical persisted `Project` entity on the backend. Building Project Intelligence directly on top of the current schema will require heavy, repetitive aggregations by string paths, making longitudinal cross-session queries inefficient at scale.

## What Project Means Today

A "Project" in the backend is merely an implicit grouping defined by the `project_root` string column.

- **Database Entity:** Does NOT exist. (Verified in `apps/api/app/features/events/models.py` Line 4: _"project_id is intentionally deferred — we store project_root as a plain path string"_).
- **Project Identity:** No UUID. Identified entirely by the `project_root` string (e.g., `/home/dev/code/vibepulse`).
- **UI Abstraction:** The frontend generates a display name dynamically by extracting the last segment of the path via `projectDisplayName(session.project_root)`.
- **Git Repository:** Not part of the project model. `git_branch` is currently just metadata stored on individual events and sessions.

## Current Data Flow

The actual verified data flow is:
**Daemon** → filesystem observation (path-based) → **DevelopmentEvent** (tagged with `project_root`) → **API** → **Session** (grouped by `project_root`) → **Dashboard** (UI maps `project_root` to `projectName`).

## Project → Session → Event Model

- **Project → Sessions:** A project has many sessions. This is enforced implicitly by querying `SELECT * FROM sessions WHERE project_root = X`.
- **Session → Events:** A session has many events. This is enforced explicitly via the `session_id` column on the `development_events` table.
- **Project → Events:** Can be obtained _directly_ via `development_events.project_root` or relationally through Sessions. Historical event data is retained permanently in `development_events`, which satisfies the longitudinal requirement.

## What We Can Truthfully Show Today

| Capability             | Support Level           | Source                  | Derivation                                    | Limitations                                                              |
| :--------------------- | :---------------------- | :---------------------- | :-------------------------------------------- | :----------------------------------------------------------------------- |
| **Project Identity**   | Partially Supported     | `sessions.project_root` | Extract basename from path.                   | No stable UUID; renaming a folder breaks history.                        |
| **Session History**    | Supported Directly      | `sessions` table        | `WHERE project_root = X`                      | Scale requires pagination.                                               |
| **Event History**      | Supported Directly      | `development_events`    | `WHERE project_root = X`                      | Querying across thousands of sessions will be slow without projections.  |
| **File Activity**      | Supported by Derivation | `development_events`    | Count `FILE_MODIFIED` grouped by `file_path`. | High modification count does not equal code complexity.                  |
| **Language Footprint** | Supported by Derivation | `sessions.languages`    | Sum language maps across sessions.            | Reflects _activity_ language, not static lines of code.                  |
| **Git Context**        | Partially Supported     | `sessions.git_branch`   | Extract unique branches used.                 | No repository identity; branch names may collide across different repos. |

## What We Cannot Claim

To maintain the DepRadar Truth Boundary, we explicitly **FORBID** the following project-level inferences (unless backed by a future deterministic analyzer):

- "Code quality improved"
- "Technical debt increased / decreased"
- "This developer works best at night"
- "Developer productivity increased"
- "This is the most important file"
- "Architecture became cleaner"

## Current Projects UI Problems

The `WorkspaceHomePage` currently renders a "Projects" section using `demoProjects` data.

- **Fake Semantics:** Uses hardcoded fake IDs (`p1`), fake health (`98%`), and unsupported features like `workspaceSize`.
- **No Navigation:** Project cards are currently not navigable (no Project Detail page exists).
- **Live Disconnect:** The UI relies entirely on Demo Data because the API has no `/projects` endpoint to list active project roots.

## Demo Data Consistency

**INCONSISTENT:** There is no unified Demo identity graph. `WorkspaceHomePage` uses `demoProjects` (fake `p1`, `p2`), while Session Details / History use `demoSession` (e.g., `session_vibesync_001`). Project Intelligence will require a canonical graph where `demoProjects` contains the roots that own the `demoSessions`.

## Security / Privacy Findings

- **Path Exposure:** `project_root` and `file_path` contain absolute paths, which frequently expose local machine usernames (e.g., `/Users/JohnSmith/repo`).
- **Recommendation:** The UI should strictly render relative paths or base names, leaving absolute paths hidden in the data layer.

## Performance Findings

Aggregating Project Intelligence on the fly will fail at scale. Querying millions of rows in `development_events` by a string `project_root` for longitudinal charts will cause severe database load.

- **Short-term:** We must aggregate at the `Session` level (summing `sessions.files` and `sessions.languages`).
- **Long-term:** We require a background materialized projection (e.g., a `project_summaries` table).

## Project Pulse Verdict

**LATER.**
While we _can_ deterministically plot event density over time across sessions, computing this temporally across an entire project's lifetime without a materialized backend projection will crash the frontend or time-out the API. It should be deferred until PX-8.2 or PX-8.3 when backend aggregations are built.

## Signature Visualization Recommendations

1. **Temporal Activity Constellation:** (Strongest) A scatter-plot mapping event density over weeks. Truthful (maps to explicit timestamps) and highly visual.
2. **File Modification Heatmap:** A visual tree or grid showing which directories/files see the most activity. Truthful (maps directly to event counts per file).

## API Gaps

- **MISSING:** `GET /api/projects` (List projects, derived from `SELECT DISTINCT project_root`).
- **MISSING:** `GET /api/projects/{encoded_root}` (Project summary and derived metadata).
- **MISSING:** `GET /api/projects/{encoded_root}/sessions` (Paginated sessions for a project).

## Database Gaps

- **MISSING:** `projects` table. Relying on `project_root` strings scattered across millions of event rows prevents efficient renaming or metadata attachment (e.g., `is_archived`, `display_name`).

## Frontend Gaps

- No `ProjectDetailsPage` route or shell.
- Missing longitudinal charting components (we have `Timeline` for a single session, but lack multi-session trend visualizations).

## Recommended Project Detail Architecture

Since we lack database UUIDs for projects, the route must be path-based (base64 encoded):
`ROUTE:` `/projects/:encodedProjectRoot`

**Information Architecture:**

1.  **Project Identity:** Name (derived from path) & Absolute Path.
2.  **Longitudinal Pulse:** (If implemented) Activity density over the last 30 days.
3.  **Language Footprint:** Activity-based language chart (derived from session aggregations).
4.  **Session History:** Paginated list of recent sessions belonging to this root.

## PX-8 MVP

**MUST HAVE:**

- API endpoints to list implicit projects and their sessions.
- Canonical Project Detail UI route.
- Session history list for the project.
- Deterministic language breakdown.
- Unified Demo Identity Graph.

## Proposed Sprint Breakdown

- **PX-8.1 — Project Detail Foundation:** Unify Demo data, create `/projects/:id` route, wire basic session listing.
- **PX-8.2 — API Project Aggregation:** Create read-only backend endpoints to group sessions by `project_root`.
- **PX-8.3 — Deterministic Metrics:** Implement Language Footprint and File Activity charts using session-level aggregations.
- **PX-8.4 — Signature Project Pulse:** (Optional MVP stretch) Implement temporal activity visualization.

## Files Created

`docs/architecture/PROJECT_INTELLIGENCE_AUDIT.md`

## Production Files Modified

NONE

## Recommended Next Action

Review this architectural audit. Once approved, we will begin PX-8.1 (Project Detail Foundation) by fixing the Demo Identity Graph and establishing the `/projects` routing shell without modifying the database schema yet.
