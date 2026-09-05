# Project Read Model

This document outlines the design decisions and architectural boundaries for the `Project` entity's Read Model and its representation in the DepRadar dashboard, as established in the PX-8.2 phase.

## 1. What the Read Model Includes vs Excludes

### Included (Direct Observations)

The canonical `ProjectRead` model is strictly limited to deterministic fields that are directly observed and uniquely identify the project:

- `id`: The canonical UUID of the project.
- `display_name`: The human-readable name of the project (typically derived from the root directory name).
- `root_path`: The canonical, normalized absolute path to the project on the observed filesystem.
- `created_at`: The exact timestamp when DepRadar first observed this project.
- `updated_at`: The exact timestamp of the most recent observation or modification.

### Excluded (Derivations and Analytics)

The Read Model explicitly **excludes**:

- `session_count`: This is dynamically determined via the paginated `GET /api/projects/{id}/sessions` endpoint (`total` metadata).
- `active_session` / `last_observed_session`: Determined by inspecting the first item returned from the sessions list endpoint.
- **Project Health Metrics**: E.g., `watchedFiles`, languages percentage breakdown, and productivity scores. These belong to future Project Intelligence features and require extensive derivation rules that do not belong in a foundational read model.
- **Timeline Derivations**: Any aggregated event data across the project.

## 2. Rationale for Exclusions

DepRadar adheres to a strict architectural rule: **Observe First. Derive Carefully. Infer Only When Evidence Supports It.**

Embedding derived metrics directly into the `ProjectRead` model forces the database to perform complex, unbounded aggregations on every project fetch. By excluding derivations like session counts or active states from the core model:

1.  **Performance:** The project retrieval remains a lightweight, O(1) indexed lookup.
2.  **Truth Boundary:** We prevent the accidental invention of "fake metrics". All aggregations are deferred to explicit, bounded queries (like the paginated sessions list) where the rules of derivation are clear and transparent.
3.  **Scalability:** The `ProjectRead` model can be safely broadcasted via WebSockets or frequently polled without causing database strain.

## 3. The Role of the Project Details Page

The Project Details page (`/projects/:projectId`) is designed to answer a singular question: **"What is this observed codebase, and what development sessions belong to it?"**

It acts as a structural container connecting the canonical Project Identity to its chronological history of development activity.

- **It is NOT a dashboard for KPIs.** We intentionally avoid rendering charts, productivity scores, or intent analysis here.
- **It IS a calm, forensic record.** The UI prioritizes a chronological, paginated list of sessions, allowing the user to progressively explore the observed history.
- **It IS a navigation hub.** It serves as the canonical anchor for a project's data, allowing seamless navigation deeper into specific `Session Details` and `Signature Replay` views, while providing context to return to the project scope.
