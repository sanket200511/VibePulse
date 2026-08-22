# Project Intelligence Truth Model (PX-8.3)

This document establishes the deterministic boundaries and formulas for VibePulse Project Intelligence. It enforces the "Observe First, Derive Carefully" mandate by ensuring every signal is reproducible from persisted telemetry without assuming developer psychology or unproven codebase states.

## 1. Truth Matrix

| Signal                                      | Source Table | Source Field(s)                       | Aggregation Strategy                                                                  | Direct/Derived | Semantic Meaning                                              | Forbidden Interpretation                       | Performance Cost                | MVP Decision |
| ------------------------------------------- | ------------ | ------------------------------------- | ------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------- | ---------------------------------------------- | ------------------------------- | ------------ |
| **Observation Window**                      | `sessions`   | `started_at`, `last_event_at`         | `MIN(started_at)` and `MAX(last_event_at)` WHERE `project_id = ?`                     | Direct         | The time boundaries of actual VibePulse observation.          | Repository age, project start/end dates.       | Very Low (indexed sweep)        | **Include**  |
| **Observed Sessions**                       | `sessions`   | `id`                                  | `COUNT(id)`                                                                           | Direct         | Total number of recorded development sessions.                | Developer work sessions, productivity.         | Very Low                        | **Include**  |
| **Total Events**                            | `sessions`   | `event_count`                         | `SUM(event_count)`                                                                    | Derived        | Total volume of tracked file and IDE events.                  | Developer output, lines of code, effort.       | Low                             | **Include**  |
| **Language Activity**                       | `sessions`   | `languages` (JSONB)                   | `SUM(value)` via JSONB key expansion (`jsonb_each_text`) across all project sessions. | Derived        | Distribution of observed events grouped by language.          | Codebase language composition, repository LOC. | Medium (JSONB expansion)        | **Include**  |
| **Event Composition**                       | `sessions`   | `events_by_type` (JSONB)              | `SUM(value)` via JSONB key expansion across all project sessions.                     | Derived        | Types of events observed (e.g., modified, deleted).           | Intent (e.g., "Refactoring", "Feature work").  | Medium (JSONB expansion)        | **Include**  |
| **Frequently Observed Files**               | `sessions`   | `files` (JSONB)                       | `SUM(value)` via JSONB key expansion, sorted by sum `DESC`, limit 50.                 | Derived        | Files that received the highest frequency of observed events. | Most important files, technical debt hotspots. | High (JSONB expansion, sorting) | **Include**  |
| **Session Activity Series (Project Pulse)** | `sessions`   | `started_at`, `event_count`, `status` | `SELECT id, started_at, event_count, status ORDER BY started_at DESC` (bounded)       | Direct         | Chronological list of sessions and their activity volumes.    | Daily productivity rhythm, work habits.        | Low                             | **Include**  |

## 2. Materialization Decision

**Decision: Live SQL Aggregation over `sessions` (Option A).**

**Rationale:**

1. **Existing Optimization:** The VibePulse Session Engine already performs incremental rollups (`event_count`, `languages`, `files`, `events_by_type`) as events arrive. We do NOT need to aggregate millions of raw `development_events`.
2. **Cardinality:** A project typically has tens to thousands of `sessions`, not millions. Expanding and aggregating JSONB columns (`jsonb_each_text`) over 1,000 rows in PostgreSQL takes low milliseconds.
3. **Simplicity:** No write amplification. No migration of a `project_summaries` table. No stale data cache invalidation.
4. **Conclusion:** Live aggregation over `sessions` is strictly the MVP architectural sweet spot.

## 3. Path Privacy Strategy

All file paths are stored exactly as received. When aggregating "Frequently Observed Files", the API will attempt to normalize paths to be relative to the `project.root_path` to avoid leaking absolute system paths (`C:\Users\...`) to the frontend intelligence UI. If normalization fails (due to case-sensitivity or symlink mismatches), the fallback is to return the raw string.

## 4. Time-Range Semantics

For PX-8.3 MVP, we will support the **"all-time"** range. Since aggregation is constrained to the `sessions` table (not raw events), an all-time query is computationally viable. Future iterations may introduce a `?days=30` query parameter which would simply inject `WHERE started_at >= NOW() - INTERVAL '30 days'`.

## 5. API Contract

**Endpoint:** `GET /api/projects/{project_id}/intelligence`

**Shape:**

```json
{
  "project_id": "uuid",
  "observation_window": {
    "first_observed_at": "datetime",
    "latest_observed_at": "datetime"
  },
  "metrics": {
    "total_sessions": "int",
    "total_events": "int"
  },
  "activity_series": [
    {
      "session_id": "uuid",
      "started_at": "datetime",
      "event_count": "int",
      "status": "string"
    }
  ],
  "event_composition": { "FILE_MODIFIED": 100, "FILE_CREATED": 5 },
  "language_activity": { "TypeScript": 100, "Python": 50 },
  "frequently_observed_files": [{ "path": "src/main.ts", "event_count": 80 }]
}
```
