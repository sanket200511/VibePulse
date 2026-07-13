# VibePulse Project Status

## Project Vision

VibePulse is a Developer Observability Platform for the AI Coding Era — it passively observes software evolution during AI-assisted development (file changes, language mix, git context, session activity) and turns that raw signal into actionable engineering intelligence, without generating or modifying any code itself.

---

## Current Milestone

Current Tag:
v0.6.0-health-engine

Current Phase:
Product Development

Current Sprint:
Sprint 7 – Health Engine

Repository Status:
Stable

---

## Completed Milestones

### Foundation

- [x] Monorepo scaffolding (pnpm workspaces + apps/packages layout)
- [x] Shared tooling configs (ESLint, TypeScript, Prettier, Ruff)
- [x] ADR system established (`docs/adr/`)
- [x] GitHub Actions CI pipeline
- [x] Docker Compose infrastructure (Postgres, Redis, pgAdmin, API)
- [x] Baseline documentation (README, CLAUDE.md, ENGINEERING.md)
- [x] Shared packages: `@vibepulse/ui`, `@vibepulse/config`

### Sprint 1 — Event Pipeline

- [x] Daemon: filesystem observer + event publisher abstraction
- [x] API: `events` feature module (feature-first architecture)
- [x] Alembic migration for `development_events`
- [x] Dashboard: Live Event Feed page with WebSocket streaming
- [x] Event-driven core established (ADR 0003)

### Sprint 2 — Analysis Pipeline

- [x] Analysis domain model + `Analyzer` protocol (ADR 0004)
- [x] Four analyzers: language, file metadata, git context, activity rate
- [x] Analysis pipeline, registry, service, and router
- [x] Idempotent analysis persistence tied to events
- [x] Full test coverage for pipeline and analyzers

### Hardening Sprint

- [x] Dependency audit — removed genuinely unused packages
- [x] Resolved all outstanding TODOs
- [x] Import/naming consistency pass across apps
- [x] Frontend test infrastructure established (Vitest + Testing Library)
- [x] Tests added for `useEventsFeed` and the WebSocket client

### Sprint 3 — Session Intelligence

- [x] Session Engine — API-owned lifecycle, independent of daemon session identity
- [x] Three-state lifecycle: ACTIVE → IDLE → COMPLETED, with lazy + swept transitions
- [x] Pluggable `SessionSummaryGenerator` protocol (heuristic implementation shipped)
- [x] Domain-level session metrics (duration, primary language, distinct files)
- [x] Sessions REST + WebSocket API, `sessions` DB migration
- [x] Dashboard: `SessionBanner`, `SessionsPage`, live session hooks
- [x] ADR 0005 — Session Engine

### Sprint 4 — Session Timeline

- [x] `timeline` feature module — pure projection over events + session data (no new persisted state)
- [x] `TimelineEntry` split into `metadata` (structural facts) and `insights` (analyzer findings) for extensibility
- [x] Semantic grouping heuristics — repeated modifications to the same file group; create/delete/rename stay distinct
- [x] Session boundary and idle-gap markers rendered inline in the timeline
- [x] Session Outcome card — duration, event count, distinct files, languages, largest change, session summary
- [x] Timeline REST endpoint plus dashboard `SessionDetailsPage` (route `/sessions/:sessionId`)
- [x] ADR 0006 — Session Timeline

### Sprint 5 — Developer Intelligence Engine

- [x] `insights` feature module — pure, deterministic, rule-based projection over Timeline data (no AI, no new persisted state)
- [x] 8 insight categories, one generator each: Activity, Files, Directories, Languages, Development Patterns, Session Statistics, Context Switching, Idle Behaviour
- [x] `DeveloperInsight` shaped as `headline` / `evidence` / `metrics` — narrative-first, extensible to future AI-generated summaries
- [x] Orchestration engine (`build_profile()`) mirroring the Analysis Pipeline's priority-ordered, per-generator error-isolated execution model
- [x] No persistence — profiles computed fresh on every request; explicitly deferred to a future optimization sprint if real performance issues appear
- [x] Insights REST endpoints (`GET /sessions/{id}/profile`, `GET /sessions/{id}/insights`) plus dashboard `InsightsPanel`, rendered narrative-first above the existing Session Outcome/Timeline metrics
- [x] ADR 0007 — Developer Intelligence Engine

### Sprint 6 — Replay Engine

- [x] `replay` feature module — pure, deterministic projection over Timeline data (no AI, no new persisted state)
- [x] `ReplayFrame`/`ReplayChapter`/`Replay` domain model — frames are a 1:1, chronologically-ordered lift of Timeline's existing entries; chapters are derived navigation boundaries layered on top
- [x] Deterministic `ChapterKind` derivation: hard boundaries from Timeline's existing markers (`SESSION_START`/`IDLE_GAP`/`SESSION_END`/`LANGUAGE_SWITCH`), soft boundaries from a 3-frame-debounced directory-shift heuristic, labels from an ordered keyword table with a directory-name fallback
- [x] `GET /sessions/{id}/replay` — 404 for an unknown session, 409 for a session that is not yet `COMPLETED`
- [x] Dashboard: `ReplayView` (playback controls, speed selector, frame scrubber, chapter-jump buttons) plus `useReplayController` and `useSessionReplay`, reusing `TimelineEntryRow` for frame rendering with zero duplicated presentation logic
- [x] `SessionDetailsPage` gates the Replay section on session status being `COMPLETED`
- [x] Fixed a pre-existing CORS bug (`cors_origins` trailing-slash mismatch) discovered during real-browser verification of this sprint's UI
- [x] ADR 0008 — Replay Engine

### Sprint 7 — Health Engine

- [x] `session_health` feature module — pure, deterministic projection over Replay's chapter output (no AI, no cross-session comparison, no new persisted state)
- [x] `HealthCategory`/`HealthMetric`/`HealthReport` domain model — exactly one metric per category (FOCUS, MOMENTUM, FLOW, STABILITY, COMPLETION), deliberately with no overall numeric score anywhere
- [x] Five fixed-threshold-band generators computed from Replay's chapters: Focus (work-time ratio), Momentum (streak-vs-idle shape), Flow (topic-shift rate), Stability (cadence coefficient of variation), Completion (categorical, from the chapter preceding `SESSION_COMPLETED`)
- [x] Rule-based `derive_guidance()` synthesis step, capped at 4 items, phrased about the session's shape rather than the developer
- [x] `GET /sessions/{id}/health` — 404 for an unknown session, 409 for a session that is not yet `COMPLETED` (mirrors Replay's own gate)
- [x] Dashboard: `HealthPanel` (fixed-order metric cards, outline-only badges, no color-coded scoring) plus `useSessionHealth`, gated the same way as Replay
- [x] `SessionDetailsPage` adds a fourth, `COMPLETED`-gated section for Session Health, after Replay
- [x] ADR 0009 — Health Engine

### Sprint PX-5.1 — Observation Domain

- [x] Defined Observation as a projection over the `development_events` stream, avoiding speculative persistence.
- [x] Introduced `OBSERVATION_STARTED` and `OBSERVATION_STOPPED` system event types.
- [x] Implemented `/projects/{project_root}/observation/start` and `/stop` command endpoints.
- [x] Added `server_received_at` timestamping to protect against client clock drift.
- [x] ADR 0011 — Observation Domain Projection

---

## Current Architecture

```
Daemon              — Observes the filesystem, publishes raw development events (no API authority)
      ↓
API                  — Ingests events, feature-first FastAPI backend (ADR 0002)
      ↓
Analysis Pipeline    — Classifies each event (language, file metadata, git context, activity rate)
      ↓
Session Engine       — Groups events into sessions, owns lifecycle (ACTIVE/IDLE/COMPLETED), computes metrics and summaries
      ↓
Timeline             — Projects a session's events into an ordered, grouped, marker-annotated narrative plus an outcome summary
      ↓
Insights             — Rule-based Developer Intelligence Engine: 8 categories of deterministic insights computed fresh from Timeline data
      ↓
Replay               — Projects Timeline entries into playable frames + deterministic chapters, for step-by-step session playback
      ↓
Health               — Aggregates Replay's chapters into five deterministic, threshold-banded health signals plus a synthesized narrative
      ↓
Dashboard            — React + Vite UI: Live Event Feed, Sessions, Session Timeline, Insights, Replay, and Session Health views, fed via REST + WebSocket
```

Completed modules and responsibilities:

- **Daemon** (`apps/daemon`) — pure event producer; no session or lifecycle logic.
- **Events feature** (`apps/api/app/features/events`) — ingestion, persistence, and WebSocket fan-out of raw development events.
- **Analysis feature** (`apps/api/app/features/analysis`) — per-event enrichment via a pluggable analyzer protocol.
- **Sessions feature** (`apps/api/app/features/sessions`) — session boundary detection, lifecycle state machine, summary generation, metrics, sweep loop.
- **Timeline feature** (`apps/api/app/features/timeline`) — read-only projection of a session's events into ordered/grouped entries, markers, and a Session Outcome summary; no persisted state of its own.
- **Insights feature** (`apps/api/app/features/insights`) — read-only, rule-based Developer Intelligence Engine; projects Timeline data into 8 categories of narrative insights, computed on demand with no persisted state of its own.
- **Replay feature** (`apps/api/app/features/replay`) — read-only projection of a `COMPLETED` session's Timeline entries into playable frames plus deterministic, non-AI chapter boundaries; no persisted state of its own.
- **Session Health feature** (`apps/api/app/features/session_health`) — read-only aggregation of a `COMPLETED` session's Replay chapters into five fixed-threshold-band health metrics plus a synthesized narrative and guidance list; no numeric score, no cross-session comparison, no persisted state of its own.
- **Dashboard** (`apps/dashboard`) — Live Event Feed, Session Banner, Sessions page, Session Details/Timeline/Insights/Replay/Session Health page, all driven by TanStack Query + reconnecting WebSocket client.
- **Shared packages** (`packages/ui`, `packages/config`) — UI primitives and cross-app config utilities.

---

## Remaining Roadmap

- ⬜ Planned — AI Fingerprint
- ⬜ Planned — Prompt Vault
- ⬜ Planned — Analytics
- ⬜ Planned — Export
- ⬜ Planned — Production Readiness

---

## Technical Debt

- Daemon → API communication is direct synchronous HTTP (interim decision per ADR 0003); a message-broker-based approach was deliberately deferred, not ruled out.
- Session sweep is an in-process `asyncio` loop rather than an externally scheduled job; acceptable at current scale but will need revisiting if the API runs as multiple replicas (no distributed lock exists yet).
- Sessions have no foreign key to `development_events` (mirrors the existing deferred `project_id` relationship); joins between the two are done by `project_root` and time range, not a hard reference.
- `SessionSummaryGenerator` currently has one heuristic implementation; no AI-generated summary implementation exists yet, though the interface is ready for one.
- Timeline is intentionally scoped to a static, read-only projection for Sprint 4 — no Replay, playback controls, or Timeline expansion/pagination; these were deferred, not ruled out (see ADR 0006). Health scoring, once one of the deferred items on this list, has since been delivered in Sprint 7 (see ADR 0009).
- Insights are intentionally not persisted for Sprint 5 — every request recomputes the profile from Timeline + Session data; persistence is deferred to a future optimization sprint if real performance issues appear at scale (see ADR 0007).
- Replay has no Redis response caching yet (designed, deferred per ADR 0008 §7 — no Redis client is wired into the FastAPI process yet); no frame-level drag-seek beyond the existing scrubber input; chapter labels are heuristic/keyword-based, not Insights-informed or AI-generated.
- Health has no Redis response caching yet either (same rationale as Replay, see ADR 0009 §10); its five metrics are fixed-threshold bands, not weighted/learned models — a future AI Fingerprint feature may consume `HealthReport` as an input feature vector without requiring any redesign of Health itself.

---

## Current Metrics

- ADRs: 10 (`docs/adr/0001`–`0009`, `0011`)
- Sprints completed: 8 (plus 1 Hardening Sprint)
- Backend tests: 231 collected (223 passing without a live database in this environment; the remainder require Postgres or hit a documented Windows asyncpg/BackgroundTasks teardown issue unrelated to correctness)
- Frontend tests: 80 passing across 14 test files
- Supported languages (analysis pipeline): 24 (including Python, TypeScript, JavaScript, Rust, Go, Java, Kotlin, Scala, C, C++, C#, Ruby, Swift, PHP, Shell, SQL, and others)
- Apps: 3 (`api`, `dashboard`, `daemon`)
- Shared packages: 2 (`ui`, `config`)
- Architecture maturity: feature-first backend, event-driven core, domain-owned session lifecycle — no auth, no distributed infrastructure (Redis/Celery) yet

---

## Next Milestone

Sprint 8 will build on the Health Engine to add an AI Fingerprint — a provider-agnostic, opt-in synthesis layer over Timeline, Insights, and Health data — which was deliberately excluded from every prior sprint's scope.

---

## Project Statistics

**Repository statistics**

- Commits: 3
- Contributors: 1 (Sanket Kurve)
- Tracked files: 163
- Total lines (tracked, excluding `pnpm-lock.yaml`): ~11,083
  - Python (`apps/api`): ~4,755 lines
  - TypeScript/TSX (`apps/dashboard`, `apps/daemon`, `packages/*`): ~2,100 lines
- Markdown documents: 12
- ADRs: 9
- Alembic migrations: 3

**Technology summary**

- Backend: Python 3.12, FastAPI (`fastapi[standard]` ≥0.115.6), SQLAlchemy 2.x (async, ≥2.0.36), Pydantic v2 (≥2.10.4), Alembic (≥1.14.0), asyncpg (≥0.30.0), `uv` for package management
- Frontend: React 18.3, Vite 6, TypeScript 5.7 (strict), TanStack Query 5.64, Tailwind CSS, Vitest + Testing Library
- Daemon: Node.js, TypeScript, Chokidar
- Infrastructure: PostgreSQL 16, Redis 7, pgAdmin, Docker Compose, GitHub Actions CI
- Monorepo tooling: pnpm workspaces, Turborepo

**Current version:** v0.6.0-health-engine

**Development phase:** Product Development — Sprint 7 (Health Engine) complete, Sprint 8 (AI Fingerprint) planned next

---

## Engineering Principles

- **Feature-first architecture** — every domain area (`events`, `analysis`, `sessions`, `timeline`, `insights`) is a self-contained module owning its own router, schema, service, and models; features never import each other's internals.
- **ADR-driven development** — architecturally significant decisions are recorded as ADRs before implementation, so design intent is documented rather than relying on tribal memory.
- **Provider-agnostic AI** — AI-augmented capabilities (e.g. session summary generation) sit behind a swappable interface (`SessionSummaryGenerator`), never hard-wired to a specific vendor or model.
- **Passive observability** — VibePulse observes development activity; it never generates, modifies, or suggests code.
- **Business logic belongs in the backend** — the dashboard is a thin, read-mostly client; all lifecycle decisions, enrichment, and aggregation happen in the API, never in the frontend.
- **Documentation evolves with implementation** — ADRs, `PROJECT_STATUS.md`, `ROADMAP.md`, `ARCHITECTURE.md`, and `CHANGELOG.md` are updated alongside code changes rather than after the fact.

---

## Architecture Evolution

```
Foundation
    ↓
Event Pipeline
    ↓
Analysis Pipeline
    ↓
Hardening
    ↓
Session Intelligence
    ↓
Session Timeline
    ↓
Developer Intelligence Engine
    ↓
Replay Engine
    ↓
Health Engine
    ↓
Observation Domain (PX-5.1)   ← current
    ↓
AI Fingerprint
    ↓
Prompt Vault
```

---

## Repository Health

A living maturity dashboard. Ratings reflect the current state of the repository, not aspiration — they should be revised every sprint.

| Category                 | Rating (1–5)                          | Reason                                                                                                                                                                                                                                                                                                           | Next Improvement Needed                                                                                                                                |
| ------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Architecture**         | 4/5                                   | Feature-first structure is consistently applied across `events`, `analysis`, `sessions`, `timeline`, `insights`, `replay`, and `session_health`; cross-feature boundaries are respected via one documented, sanctioned integration seam per consumer; nine ADRs (0001–0009) back the major structural decisions. | Resolve the sweep loop's single-instance assumption before adding another feature module that would compound the same limitation.                      |
| **Documentation**        | 5/5                                   | Nine ADRs, `README.md`, `CLAUDE.md`, `ENGINEERING.md`, `DESIGN.md`, `PROJECT_STATUS.md`, `DEMO.md`, `ROADMAP.md`, `ARCHITECTURE.md`, and `CHANGELOG.md` all exist and are kept current with implementation.                                                                                                      | Keep every one of these documents updated in the same PR/session as the code change that motivates it, not after.                                      |
| **Testing**              | 3/5                                   | 231 backend tests collected, 80 frontend tests passing across 14 files; coverage exists for every feature module (events, analysis, sessions, timeline, insights, replay, session_health) and both hook layers on the frontend.                                                                                  | Only 223 of 231 backend tests pass without a live Postgres instance — get the suite running fully in CI without requiring a manually-started database. |
| **Developer Experience** | 4/5                                   | `pnpm dev` and `docker compose up -d` bring the whole stack up in two commands; `.claude/launch.json` documents local dev server config; feature-first layout makes it obvious where new code belongs.                                                                                                           | Add a documented one-command bootstrap (install + migrate + seed) so a new contributor doesn't need to read multiple docs to get running.              |
| **Performance**          | 2/5                                   | No load testing or profiling has been done yet; the analysis pipeline runs as a background task specifically to avoid blocking ingestion latency, which is the only performance-motivated design decision made so far.                                                                                           | Establish a baseline: measure ingestion throughput and analysis pipeline latency under a realistic event rate before optimizing anything.              |
| **Security**             | 1/5                                   | No authentication or authorization exists on any REST or WebSocket endpoint; this is a documented, intentional scoping decision (see Technical Debt), not an oversight, but it means the current state offers no real security posture.                                                                          | Add authentication as the first Production Readiness (Phase 5) deliverable before any deployment beyond a local machine.                               |
| **Deployment**           | 2/5                                   | Docker Compose covers local infrastructure only; Dockerfiles exist for all apps, but there is no deployment target (staging/production), no CI/CD deployment step, and no documented rollout process.                                                                                                            | Write a deployment guide and stand up at least one non-local environment to validate the Docker images actually work outside development.              |
| **Scalability**          | 2/5                                   | The session sweep loop is a single in-process `asyncio` loop with no distributed lock — documented as technical debt — and there is no load-balancing or multi-replica story for the API.                                                                                                                        | Introduce a distributed lock (or move the sweep to an external scheduler) before running more than one API replica.                                    |
| **Product Features**     | 4/5 (for the current milestone scope) | Event Pipeline, Analysis Pipeline, Session Intelligence, Session Timeline, the Developer Intelligence Engine, the Replay Engine, and the Health Engine are all fully delivered and tested end to end, matching the "Completed Milestones" section above exactly.                                                 | Ship the AI Fingerprint (Sprint 8) — the next planned capability — to keep the Remaining Roadmap moving.                                               |
