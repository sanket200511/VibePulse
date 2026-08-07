# VibePulse Architecture

This document is the complete technical reference for VibePulse. It assumes no prior context beyond general familiarity with web backends and React — after reading it, an engineer should understand every subsystem, why it exists, and how the pieces fit together.

---

# Architecture Principles

**Passive observation.** VibePulse never writes, suggests, or modifies the code it watches — it only observes filesystem activity and reports on it. This is a hard boundary baked into every layer (the daemon has no write access to the project it watches), not just a product decision, because it's what makes the platform trustworthy to point at any codebase.

**Business logic belongs in the backend.** Session boundaries, lifecycle transitions, analysis enrichment, and summary generation are all decided and computed server-side. The dashboard never re-derives a metric the API has already computed — it renders what it's given.

**Thin frontend.** The React dashboard's job is fetch-once-then-subscribe: one REST call for initial state, one WebSocket subscription for live updates, and presentational components underneath. No page contains business rules about what a session is or when it ends.

**Feature-first architecture.** Each domain capability (`events`, `analysis`, `sessions`) is a self-contained module owning its own router, schema, service, and models, with `app/core/` reserved strictly for horizontal concerns. This lets the platform add new capabilities as new folders rather than as edits scattered across shared files.

**Pipelines over monoliths.** Both the Analysis Pipeline and the Session Engine are built as ordered sequences of small, independent, composable stages rather than single large functions. A new analyzer or a new session-derived insight is a registry addition, not a rewrite.

**Provider-agnostic AI.** Anywhere AI is introduced — today's `SessionSummaryGenerator`, tomorrow's AI Fingerprint — it sits behind an explicit interface with a working non-AI fallback, so no capability is architecturally married to a specific model vendor or dependent on a model being available.

**Explicit interfaces.** `Analyzer` and `SessionSummaryGenerator` are Python `Protocol`s, not base classes — conformance is structural, not inherited. New implementations are added by registration, keeping extension points visible and enumerable rather than hidden behind subclassing.

**Incremental evolution.** Every capability is designed to build on data and structures that already exist rather than requiring new observation infrastructure per feature — Session Timeline, Replay, and Health Engine are all planned to read from data the platform already collects today.

**ADR-driven engineering.** Every architecturally significant decision — from the monorepo strategy to the session lifecycle's three states — is recorded as an ADR before implementation, so the reasoning behind the codebase's structure is documented, not dependent on tribal memory.

---

# High-Level Architecture

```
 ┌──────────┐      HTTP POST /events      ┌─────────────────────────────┐
 │  Daemon  │ ───────────────────────────▶│             API             │
 │ (Node.js)│                              │          (FastAPI)          │
 └──────────┘                              │                             │
                                            │  events → analysis → sessions │
                                            └───────────────┬─────────────┘
                                                             │
                                              REST + WebSocket (/ws/events, /ws/sessions)
                                                             │
                                                             ▼
                                            ┌─────────────────────────────┐
                                            │          Dashboard          │
                                            │      (React + Vite)         │
                                            └─────────────────────────────┘

                                            ┌─────────────────────────────┐
                                            │   PostgreSQL 16 (async)     │
                                            │ development_events          │
                                            │ event_analyses               │
                                            │ sessions                     │
                                            └─────────────────────────────┘
```

The Daemon is the only component that touches the filesystem being observed. It has no knowledge of sessions, analysis, or lifecycle — it simply detects file changes and posts them to the API. The API is the system's brain: it persists raw events, enriches them via the Analysis Pipeline, and groups them into Sessions via the Session Engine. The Dashboard is a thin, read-mostly client: every page loads its initial state over REST once, then stays live via a WebSocket subscription — it computes nothing the API hasn't already computed.

---

# Monorepo Structure

```
apps/api/          FastAPI backend (Python 3.12)
apps/dashboard/     React + Vite dashboard (TypeScript)
apps/daemon/        Node.js filesystem observer (TypeScript)
packages/ui/        Shared React component primitives
packages/config/    Shared env/config utilities (Node-compatible)
docs/adr/           Architecture Decision Records
docker/             Dockerfiles and infrastructure configs
```

**`apps/api`** — The FastAPI backend. Organized feature-first (see below) into `app/features/events`, `app/features/analysis`, `app/features/sessions`, plus `app/core` for cross-cutting concerns (config, database, logging, domain types) and `app/main.py` for wiring only. Owns all lifecycle decisions, persistence, and enrichment.

**`apps/dashboard`** — The React dashboard. Pages live under `src/pages/<feature>/` (`events/`, `sessions/`), each with its own types, TanStack Query hooks, and presentational components. `src/lib/` holds cross-page infrastructure: the reconnecting WebSocket client and API base-URL resolution.

**`apps/daemon`** — The Node.js filesystem observer. Watches a project directory (via `watcher.ts`, backed by Chokidar), builds structured events (`event-builder.ts`), detects language (`language-detector.ts`) and git branch (`git-branch.ts`), and publishes them to the API through a `Publisher` abstraction (`publisher/http-publisher.ts`) — deliberately swappable if a non-HTTP transport is ever needed.

**`packages/ui`** — Shared, domain-agnostic React primitives (e.g. `Badge`). Nothing feature-specific belongs here; if a component only makes sense for events or sessions, it lives in the dashboard's own `pages/` tree instead.

**`packages/config`** — Shared, Node-compatible environment/config utilities usable by both the dashboard build and the daemon.

**`docs/adr`** — Every architecturally significant decision, in order, as immutable historical record (see ADR Summary below).

**`docker/`** — Dockerfiles and `docker-compose.yml` for production and CI infrastructure (Postgres, Redis, pgAdmin, API). Local development uses native instances (e.g., local PostgreSQL and Redis Cloud) without requiring Docker containers.

---

# Technology Stack

| Layer                  | Technology                    | Why                                                                                                                                                                                       |
| ---------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API**                | FastAPI (Python 3.12)         | Native async support end-to-end — matches an I/O-bound workload (event ingestion, DB writes, WebSocket fan-out) better than a sync-first framework.                                       |
| **API**                | SQLAlchemy 2.x (async)        | Modern `Mapped`/`mapped_column` typed ORM with a first-class async engine (`asyncpg` driver), avoiding hand-rolled SQL for anything but the one deliberate cross-feature existence check. |
| **API**                | Pydantic v2                   | Enforces the "never use a raw dict for a request/response schema" rule (CLAUDE.md) and gives free request validation + OpenAPI docs.                                                      |
| **API**                | Alembic                       | Versioned, reversible schema migrations, one per feature module's introduction.                                                                                                           |
| **Database**           | PostgreSQL 16                 | ACID-compliant relational storage with strong native JSONB support — needed for the semi-structured `findings`, `events_by_type`, `languages`, and `files` columns.                       |
| **Dashboard**          | React 18 + Vite               | Fast dev server and HMR; React's component model fits the page/row/hook structure used throughout.                                                                                        |
| **Dashboard**          | TypeScript (strict)           | Wire-shape types (`Session`, `DevelopmentEvent`) are hand-mirrored from the Pydantic schemas, and strict mode catches drift between the two at compile time.                              |
| **Dashboard**          | TanStack Query                | Handles the one-shot initial REST fetch (loading/error state, caching) so hooks only need to handle the live WebSocket delta on top.                                                      |
| **Dashboard**          | Tailwind CSS                  | Utility-first styling keeps page/row components self-contained without a separate stylesheet per component.                                                                               |
| **Daemon**             | Node.js + TypeScript          | Chokidar (the de facto standard filesystem watcher for Node) is a natural fit, and TypeScript keeps the event-shape contract with the API in sync.                                        |
| **Monorepo**           | pnpm workspaces + Turborepo   | Efficient, deduplicated installs and cached, dependency-aware task running (`lint`, `typecheck`, `test`) across three apps and two packages.                                              |
| **Containers**         | Docker Compose                | Reproducible local infrastructure (Postgres, Redis, pgAdmin, API) without requiring every contributor to install and configure each service manually.                                     |
| **Package management** | `uv` (Python), `pnpm` (JS/TS) | Both are fast, lockfile-driven, and are the only sanctioned package managers for their respective ecosystems — enforced by CLAUDE.md, not just convention.                                |

---

# Domain Model

**`DevelopmentEvent`** — The atomic unit of observation: one file-system occurrence (`FILE_CREATED`, `FILE_MODIFIED`, `FILE_DELETED`) at a point in time, for a given `project_root` and `file_path`, carrying the daemon's own `session_id`, detected `language`, and `git_branch`. Deduplicated on `(session_id, file_path, event_type, timestamp)` since editors can double-fire saves (e.g. temp-file renames).

**`Analysis`** (`EventAnalysis`) — One row per `(event, analyzer)` pair: the structured `findings` (JSONB) a single analyzer produced for a single event, plus its `duration_ms` and any `error`. Many `EventAnalysis` rows point at one `DevelopmentEvent` (foreign key with `ON DELETE CASCADE`); a session has no direct relationship to `EventAnalysis` — the session only reads the event stream, not per-event findings.

**`Session`** — One continuous period of development activity for a single `project_root`, entirely independent of the daemon's own `session_id` (which is stored only as an inert hint, `daemon_session_id`). A session aggregates many `DevelopmentEvent`s into running counters (`event_count`, `events_by_type`, `languages`, `files`) and owns its own lifecycle state (`ACTIVE` / `IDLE` / `COMPLETED`).

**`SessionSummary`** — Produced exactly once, when a `Session` transitions to `COMPLETED`. Not a separate table — it is generated from the session's own final aggregate counters (via a `SessionSnapshot`) and stored inline as a JSONB column on the `Session` row itself, since it is 1:1 with the session and has no independent lifecycle.

**Relationships:**

```
DevelopmentEvent  (many) ──────▶ (one)  Session        [grouped by project_root + time gap, no FK]
DevelopmentEvent  (one)  ──────▶ (many) EventAnalysis   [FK: event_analyses.event_id]
Session           (one)  ──────▶ (0..1) SessionSummary  [embedded JSONB, not a table]
```

The absence of a foreign key between `DevelopmentEvent` and `Session` is deliberate, mirroring the same `project_id` deferral already made for `DevelopmentEvent` — sessions are computed from event timing and `project_root`, not tracked via a hard reference, keeping the two features decoupled per the feature-first rule (ADR 0002).

---

# Event Flow

```
Daemon
  ↓  detects a file change, builds a structured event, POSTs it
API  (events feature: POST /events)
  ↓  persists the DevelopmentEvent; on first-time creation:
Analysis
  ↓  pipeline runs (as a background task, after the 201 response is sent)
Session
  ↓  touch_session() attaches the event to a session (same request, synchronously)
Dashboard
     receives both the raw event (over /ws/events) and the updated session (over /ws/sessions)
```

Concretely, `POST /events` (`apps/api/app/features/events/router.py`):

1. Calls `events.service.create_event()`, which persists the row (or returns the existing one if it's a duplicate).
2. If newly created: broadcasts the raw event over `/ws/events`, then schedules the analysis pipeline as a `BackgroundTask` using a **fresh** database session (`AsyncSessionLocal`, not the request-scoped one, since the request session may already be closed by the time the task runs).
3. Still within the same request, synchronously calls `session_service.touch_session()` using the **request-scoped** session — cheap enough (a counter update) not to need backgrounding — and broadcasts the resulting `session.started` or `session.updated` message over `/ws/sessions`.

This split is intentional: analysis is comparatively expensive and independent of the response, so it's backgrounded; session bookkeeping is cheap and directly relevant to the response's correctness, so it stays synchronous and transactional with the event write.

---

Product Layer

↓

Developer Workspace

↓

Timeline

Replay

Reflection

Insights

---

# Session Lifecycle

```
ACTIVE
  ↓  silent for ≥ SESSION_IDLE_TIMEOUT_SECONDS (default 300s)
IDLE
  ↓  silent for ≥ SESSION_IDLE_TIMEOUT_SECONDS + SESSION_COMPLETION_TIMEOUT_SECONDS (default 300s + 900s)
COMPLETED   (terminal — a later event always starts a brand-new session)
```

Three mechanisms enforce this together, all in `app/features/sessions/service.py`:

1. **`touch_session()`** — runs on every incoming event. Looks up the most recent non-`COMPLETED` session for the event's `project_root`. If the gap since that session's `last_event_at` is within `idle_timeout + completion_timeout`, the event extends it (and flips it back to `ACTIVE` if it had drifted to `IDLE`). If the gap is larger, the candidate is **lazily finalized** right there (so a stale session is never silently reactivated) and a brand-new session is started instead.
2. **`sweep_once()`** — a periodic pass (an in-process `asyncio` loop started in `main.py`'s `lifespan()`, interval `SESSION_SWEEP_INTERVAL_SECONDS`, default 30s) that persists due transitions even if no new event ever arrives to trigger them: `ACTIVE` → `IDLE` once silent past the idle timeout, `IDLE` → `COMPLETED` (generating the summary) once silent past the completion timeout on top of that.
3. **`compute_effective_status()`** — a pure function used on every read path (REST responses, WebSocket broadcasts). It reports what the status _should_ be right now, even if the sweep hasn't caught up yet — so a GET request is never stale, regardless of sweep timing.

This design means the dashboard never has to reason about "is the sweep loop running" — every read is self-correcting.

---

# Analysis Pipeline

**Analyzer** (`app/features/analysis/base.py`) — A `Protocol` (not a base class) that any plugin satisfies by exposing `name`, `version`, `description`, `priority`, `enabled`, and a synchronous, side-effect-free `analyze(event, context) -> AnalysisFinding | None` method. Returning `None` means "this analyzer opts out for this event." Implementations include: `LanguageAnalyzer`, `FileMetadataAnalyzer`, `GitContextAnalyzer`, `ActivityRateAnalyzer`, `StaticAnalysisAnalyzer` (which performs language-agnostic AST parsing via `tree-sitter`), `SecurityAnalyzer` (which performs deterministic rule-based security pattern matching), and `CodeEvolutionAnalyzer` (which deterministically reconstructs codebase evolution).

**Registry** (`app/features/analysis/registry.py`) — The single canonical list (`ANALYZERS`) of active analyzer instances. Adding a new analyzer means instantiating it here; the pipeline sorts by `priority` automatically, so list order doesn't matter.

**Pipeline** (`app/features/analysis/pipeline.py`) — Runs every enabled analyzer (sorted by priority) against one event, catching and recording any exception per-analyzer so one failing analyzer never blocks the rest. Stateless beyond its immutable analyzer list, so a single instance is safe to share across concurrent requests. It does **not** persist anything — that separation is deliberate.

**Repository** (`app/features/analysis/repository.py`) — The only code that writes to the `event_analyses` table. Uses `INSERT … ON CONFLICT DO UPDATE` keyed on `(event_id, analyzer_name)`, making pipeline re-runs idempotent — re-analyzing the same event updates existing rows rather than duplicating them.

`app/features/analysis/service.py` ties these together (build context → run pipeline → save via repository) and is what the events router's background task actually calls.

---

# Dashboard Architecture

**React** — Each page (`EventsPage`, `SessionsPage`) is a composition of small, presentational row/badge components (`EventRow`, `SessionRow`, `SessionBanner`) fed entirely by a single custom hook (`useEventsFeed`, `useSessionsData`, `useCurrentSession`). Components hold no fetching or WebSocket logic themselves.

**TanStack Query** — Owns exactly the initial load: one `useQuery` call per hook fetches the current REST snapshot (`GET /events`, `GET /sessions`, `GET /sessions/current`) and provides loading/error state. It is never used for the live updates that follow.

**WebSocket** — `connectWs()` (`src/lib/ws-client.ts`) is a small reconnecting client with exponential backoff, used identically by all three data hooks against `/ws/events` or `/ws/sessions`. Each hook's `onMessage` callback merges incoming broadcasts into local React state — append-and-cap for events (`useEventsFeed`, capped at 200), upsert-by-id-and-resort for sessions (`useSessionsData`, since sessions mutate in place rather than being append-only), and adopt/track/clear for the single current session (`useCurrentSession`).

**REST** — Used only for each page's one-time initial load. All subsequent state changes arrive over the WebSocket; the dashboard never polls.

---

# Database Design

**Tables:**

- `development_events` — one row per observed file event. Unique on `(session_id, file_path, event_type, timestamp)` for idempotent ingestion; indexed on `timestamp` (recency queries) and `session_id`.
- `event_analyses` — one row per `(event, analyzer)`. Foreign key to `development_events.id` with `ON DELETE CASCADE` (deleting an event cleans up its analyses automatically, simplifying test teardown). Unique on `(event_id, analyzer_name)`, which doubles as the `ON CONFLICT` target for idempotent upserts. Indexed on `event_id` for the primary "fetch all analyses for this event" lookup.
- `sessions` — one row per session. Indexed on `(project_root, status)` for the "is there an open session for this project?" lookup used by `touch_session()`, and on `last_event_at` for the sweep loop's cutoff queries.

**Relationships:** `event_analyses.event_id → development_events.id` is the only real foreign key in the schema. `sessions` has no FK to `development_events` — the relationship is computed (by `project_root` and time proximity), not enforced at the database level, matching the deliberate `project_id`-deferral precedent from Sprint 1.

**Indexes** are all purpose-built for a specific query already present in the codebase — there are no speculative indexes. Each one is named after the lookup it serves (`ix_sessions_project_root_status`, `ix_sessions_last_event_at`, etc.).

**JSONB usage** — `development_events.metadata`, `event_analyses.findings`, and `sessions.events_by_type` / `languages` / `files` / `summary` are all JSONB. Each is either genuinely schema-flexible (per-analyzer `findings`, whose shape is owned by the analyzer class, not the database) or an aggregate counter/document that only its owning row ever reads or writes as a whole — never queried into or joined against, so normalizing them into separate tables would add join complexity with no query benefit.

---

# API Design

**REST endpoints:**

| Method & Path                     | Feature  | Purpose                                                                                                                                                    |
| --------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /events`                    | events   | Daemon ingests one development event. Returns 201 on first observation, 200 on a duplicate (never an error).                                               |
| `GET /events`                     | events   | Dashboard loads recent events on page load.                                                                                                                |
| `GET /events/{event_id}/analysis` | analysis | Fetch all persisted analyzer findings for one event. 404 only if the event itself doesn't exist; an empty list means the pipeline hasn't run yet.          |
| `GET /sessions`                   | sessions | List recent sessions, newest activity first.                                                                                                               |
| `GET /sessions/current`           | sessions | The single session currently `ACTIVE` or `IDLE`, if any (registered before `/sessions/{id}` — otherwise FastAPI would try to parse `"current"` as a UUID). |
| `GET /sessions/{session_id}`      | sessions | Fetch one session by id. 404 if unknown.                                                                                                                   |
| `GET /health`                     | health   | Liveness/readiness check used by Docker Compose's healthcheck.                                                                                             |

**WebSocket channels:**

| Path           | Feature  | Broadcasts                                                                                                                                                                                                                            |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/ws/events`   | events   | The raw `DevelopmentEventRead` payload, once per newly created event.                                                                                                                                                                 |
| `/ws/sessions` | sessions | `{"type": "session.started" \| "session.updated" \| "session.idle" \| "session.completed", "session": SessionRead}` — always the full current `SessionRead`, never a partial patch, so clients never need to merge deltas themselves. |

Both channels are broadcast-only from the server's perspective (the connection is kept alive by awaiting `receive_text()` purely to detect client disconnects) and are served by a small `ConnectionManager` class per feature, tracking connected sockets and fanning out `broadcast()` calls to all of them.

---

# Feature-First Architecture

VibePulse deliberately does **not** use a global `routers/`, `models/`, `schemas/`, `services/` layout. Instead, every domain area is a self-contained module under `app/features/<name>/`, owning its own `router.py`, `schemas.py`, `service.py`, and `models.py`. `app/core/` is reserved strictly for horizontal, cross-cutting concerns — config, database session management, logging, and shared domain types (`app/core/domain/`) — never business logic.

This was chosen (ADR 0002) because the platform's domain areas — event collection, analysis, sessions, and future ones like Replay and Health — are naturally independent capabilities that get added incrementally over many sprints, not simultaneous parts of one cohesive layer. A feature-first layout means a new capability is additive (a new folder) rather than a set of scattered edits across shared `routers.py`/`models.py` files, and it makes each feature's blast radius obvious: features must not import each other's internals, so anything a feature needs from another must either go through that feature's public router (an explicitly-commented "integration seam," as seen in `events/router.py` importing `analysis.service` and `sessions.service`) or be lifted into `app/core/domain/` as genuinely shared vocabulary.

---

# ADR Summary

- **ADR 0001 — Monorepo Strategy.** Establishes a single repository containing the dashboard, API, and daemon, reasoning that these tightly-coupled components (sharing event/session contracts) benefit more from atomic cross-component commits and shared tooling than from independent repository lifecycles.
- **ADR 0002 — Feature-First Architecture.** Rejects a global `routers/models/schemas/services` layout in favor of self-contained `app/features/<name>/` modules, anticipating that the platform's domain areas will keep growing sprint over sprint and need to be addable without touching shared files.
- **ADR 0003 — Event-Driven Core.** Establishes that the daemon publishes events and the API consumes them asynchronously, with the daemon never making a synchronous call that blocks on API-side processing; adopts direct HTTP as the current interim transport rather than introducing a message broker before it's proven necessary.
- **ADR 0004 — Analysis Pipeline Architecture.** Establishes the `Analyzer` Protocol, the priority-ordered `AnalysisPipeline`, and the idempotent-upsert `AnalysisRepository`, with analysis dispatched as a background task so ingestion latency is never coupled to enrichment cost, and one analyzer's failure never blocks the others.
- **ADR 0005 — Session Engine.** Establishes that the API — not the daemon — is the sole authority on session boundaries; introduces the three-state `ACTIVE → IDLE → COMPLETED` lifecycle (rejecting a simpler two-state design because it made "should a very late event reactivate an old session" ambiguous); keeps summary generation behind a `SessionSummaryGenerator` interface so a future AI-backed implementation can replace the current heuristic one without touching lifecycle code; and mandates that session metrics are computed once, in the domain/schema layer, rather than being re-derived by the dashboard.

---

# Future Architecture

**Session Timeline** — A read-oriented view over data the platform already collects (`development_events` grouped by `session_id`/`project_root`), presenting a session's events in chronological order as a navigable narrative rather than a flat feed.

**Replay Engine** — Reconstructs the sequence of file changes within a session step by step, using the same event history the Session Engine already aggregates — a presentation and sequencing concern layered on top of existing data, not a new observation mechanism.

**Health Engine** — Scores sessions and projects along dimensions such as complexity, consistency, and pacing, consuming the outputs of the existing Analysis Pipeline and Session Engine as its inputs rather than re-observing the filesystem.

**AI Fingerprint** — Detects statistical or stylistic signatures characteristic of AI-assisted authorship within already-observed activity (event timing patterns, analyzer findings), extending the Analysis Pipeline's plugin model rather than replacing it.

**Prompt Vault** — Correlates externally-supplied prompts with the resulting observed changes, intended to sit behind the same provider-agnostic interface pattern already established by `SessionSummaryGenerator`.

None of these require new architectural primitives — each is designed to consume data the Events, Analysis, and Sessions features already produce, which is precisely what the feature-first, pipeline-based design was built to allow.

---

# Engineering Principles

- **Observation, not generation.** VibePulse never writes or modifies the code it observes. Every capability, present and future, is built from data collected by watching, never by acting.
- **Feature isolation.** Domain areas are self-contained modules that never import each other's internals; anything shared crosses through an explicit router-level seam or is lifted into `app/core/domain/`.
- **Separation of orchestration from persistence.** The Analysis Pipeline runs analyzers; the Repository persists results. The Session Engine mutates lifecycle state; the caller owns the commit boundary. Nothing does both.
- **Pluggable-by-protocol, not by inheritance.** `Analyzer` and `SessionSummaryGenerator` are Python `Protocol`s, not base classes — new implementations are added by registration, not by subclassing a framework type.
- **Reads are always correct, independent of background timing.** `compute_effective_status()` exists specifically so a client's read is never stale merely because a periodic sweep hasn't run yet.
- **No infrastructure before it's earned.** Redis, Celery, and APScheduler are all deliberately absent — an in-process `asyncio` sweep loop and direct HTTP from the daemon are sufficient at current scale, and are documented as interim choices, not permanent ones.
- **Decisions are written down.** Every architecturally significant choice becomes an ADR before implementation — the codebase's structure should always be explainable by pointing at a document, not by tribal memory.

---

# Architecture Constraints

These are intentional, current-state limitations — not oversights — each scoped to be revisited by a specific future phase:

- **Single-user focused for now.** The data model (one project, one developer's activity per session) has no multi-user or multi-tenant concept yet. This exists because Sprints 1–12 were focused on proving the observation and session model works at all; multi-user semantics are explicitly deferred to post-v1.0 so they aren't designed on top of a still-evolving core.
- **No authentication yet.** Every REST and WebSocket endpoint is open. This is a deliberate scoping decision, not an omission — adding auth is orthogonal to proving the observability model itself, and is scheduled for `v1.1.0`.
- **No distributed infrastructure.** There is no Redis-backed queue, no Celery worker pool, and no distributed lock anywhere in the system. A single API process is sufficient at current scale (v1.0.0). A Redis distributed lock is targeted for `v1.1.0`.
- **No message broker.** The daemon talks to the API over direct synchronous HTTP (ADR 0003), rather than through a broker like RabbitMQ or Kafka. This was a deliberate interim choice: direct HTTP is simple to reason about and sufficient for a single daemon instance.
- **No Kubernetes dependency.** The entire stack runs via Docker Compose. Kubernetes-specific concerns (multi-replica scheduling, service meshes) aren't relevant until the platform actually needs to run more than one API instance.
- **No cloud dependency.** VibePulse runs entirely locally today — Postgres, Redis, and the API all run in local Docker containers, and the dashboard/daemon run directly on the developer's machine. No cloud provider SDK, managed database, or hosted queue is required, keeping the platform fully self-contained until Cloud Sync is taken up.
