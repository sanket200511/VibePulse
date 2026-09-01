# Changelog

All notable changes to VibePulse are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

> **Note on versioning:** The `v0.2.0-session-intelligence` git tag currently points at the events-pipeline commit (`4cf448e`) rather than the commit that actually contains the Analysis Pipeline and Session Engine (`26cf63d`, currently `HEAD`, untagged). The entries below are grouped by what each milestone actually delivered — consistent with `PROJECT_STATUS.md` and `ROADMAP.md` — not by the tag's current git placement. The tag should be moved to `26cf63d` (or a new tag cut) to match this changelog.

## [v1.4.0] - Sprint 14 Final Truth Audit, Academic Packaging & Dedicated Port Migration

### Added

- **Dedicated Port Namespace**: Migrated all development services to dedicated, clash-free ports: FastAPI (`5184`), Dashboard (`5183`), Daemon (`5185`), PostgreSQL (`5432`), Redis (Cloud).
- **Professional Terminal Supervisor UX (`pnpm dev`)**: Introduced structured log hierarchy (`[TIME] [SERVICE] [LEVEL] MESSAGE`), preflight conflict detection, and sub-second CLI stack inspector (`pnpm dev:status`).
- **Forensic Truth Audit Verification**: Validated 100% claim-to-code traceability across 348 Backend Pytest and 130 Daemon Vitest test suites.
- **Academic Defense Portfolio**: Formulated complete B.Tech final thesis report (`FINAL_PROJECT_REPORT.md`), oral viva cheat-sheet (`VIVA_MASTER_SHEET.md`), and presentation deck (`PPT_CONTENT.md`).
- **Master Documentation Index**: Created authoritative master documentation registry (`docs/DOCUMENTATION_INDEX.md`).

---

## [v1.3.0] - Sprint 13 Demonstration & Academic Readiness

### Added

- **10-Stage Canonical Intelligence Loop**: Verified full lifecycle pipeline ($\text{OBSERVE} \to \text{DETECT} \to \text{UNDERSTAND} \to \text{INVESTIGATE} \to \text{RESOLVE} \to \text{LEARN} \to \text{PREDICT} \to \text{ASK} \to \text{ACT} \to \text{MEMORY}$).
- **Automated Seminar Demonstrator**: Introduced timed 5-minute presenter runbooks, seminar doctor readiness audit (`scripts/seminar-doctor.mjs`), and 10-stage demo runner (`scripts/final-demo.mjs`).
- **Empirical Evaluation Benchmarks**: Measured local performance (sub-millisecond AST latency, deterministic reconstructibility $A \equiv B$).

---

## [v1.2.0] - Sprint 12 AI Engineering Copilot Foundation & Productization

### Added

- **Zero-LLM AI Engineering Copilot**: 16 canonical query families with grounded tri-state facts (`[OBSERVED]`, `[INFERRED]`, `[UNKNOWN]`), out-of-scope Answerability Gate, and AST intent classification.
- **Engineering Knowledge Graph & Project Memory 2.0**: Multi-entity semantic graph traversal (`CONTAINS`, `AFFECTS`, `RESOLVED_BY`) and portable `PROJECT_CONTEXT.md` AI handoff export.
- **Unified Engineering Command Center**: Single-pane dashboard featuring the Metric Triad (`Overall Health Score`, `Security Risk Score`, `Forecast Strength`) and live WebSocket telemetry.
- **Safe Project Deletion**: Database-only cascading teardown preserving user code on disk.

---

## [v1.1.0] - Sprints 7-11 Intelligence Core & Causal Investigation

### Added

- **Security Intelligence 2.0**: Tree-Sitter & Python AST analyzers (`SEC001`, `DEBUG_TRUE`) with strict secret masking to `[REDACTED]`.
- **Investigation Engine 3.0**: Causal Directed Acyclic Graph (DAG) generation and 5-dimension mathematical score decomposition ($W_i \times S_i$).
- **Incident Resolution Intelligence**: Multi-state triage workflows (`OPEN` $\to$ `INVESTIGATING` $\to$ `REVIEWED` $\to$ `RESOLVED`) and immutable PostgreSQL audit history (`incident_review_states`, `incident_review_history`).
- **Predictive Engineering Intelligence**: Empirical churn acceleration analysis and regression risk forecasting.
- **Unified Project Health**: 5-dimension weighted composite scoring model.

---

### Added

- **Final Production Hardening**: Platform declared ready for internal production deployment.
- **Test Suite Determinism**: Introduced a thread-safe `BackgroundTasks` proxy tracker in `conftest.py`, eradicating `IntegrityError` and `MissingGreenlet` race conditions across all 261 backend tests.
- **Enterprise Documentation**: Generated comprehensive documentation including System Design, Deployment Guides, Security Policies, and Architecture schemas.

### Changed

- **Type Safety**: Strictly typed FastAPI routing layer and `dispatch` module, removing dead monkeypatching code (`_running_tasks`).
- **Linter Enforcements**: Stripped deprecated Ruff rules (`ANN101`, `ANN102`) and tightened React ESLint rules to strictly handle Promise resolutions for React Router DOM `navigate()` functions.
- **Test Isolations**: Test teardown now correctly respects nested SQLAlchemy SAVEPOINTS while enforcing clean lifecycle drains.

### Fixed

- Fixed `@typescript-eslint/no-misused-promises` errors in `TimelineCard.tsx`.
- Fixed DOM attribute assertion brittleness in `ProjectCard.test.tsx` by separating concatenated CSS class checks (`ring-2 ring-accent-color`).

---

## [v0.8.0-observation-pipeline] - Sprint PX-5.2

### Added

- **Daemon/API Integration**: The API now securely proxies `start` and `stop` observation commands to the daemon's control endpoint.
- **Idempotent Observation Control**: The observation proxy uses an idempotent design; repeated requests to start an already running observation (or stop a stopped one) return 200 OK cleanly instead of generating 409 errors.
- **`daemon_seq` Support**: Event schemas and database models now include a `daemon_seq` property to maintain parity with the daemon's internal event debouncing sequence.
- **Architectural Refinements**: Removed TOCTOU (Time-Of-Check to Time-Of-Use) pattern by removing the `GET /health` pre-check from observation commands. The daemon intrinsically decides and reports its prior state.
- **Alembic Migration**: Added migration `0004` introducing `daemon_seq` and `server_received_at` to the database while relaxing non-null constraints on `file_path` and `file_name` for boundary events.
- **Debouncer Delete Safety**: Resolved the delete edge case by ensuring `FILE_DELETED` events cancel any pending debounce timers for the same file path before being emitted.

---

## [v0.7.0-observation-domain] - Sprint PX-5.1

### Added

- Defined the Observation Domain as a projection over the `development_events` stream, ensuring timeline and replay consistency.
- Introduced `OBSERVATION_STARTED` and `OBSERVATION_STOPPED` to `EventType`.
- Explicit `/projects/{project_root}/observation/start` and `/stop` API endpoints.
- `server_received_at` timestamp recorded for accurate timeline synchronization.

### Documentation

- Expanded ADR-0011 (Observation Domain Projection).

---

## [v0.6.0-health-engine]

### Added

- Health feature module (`apps/api/app/features/session_health/`): pure domain (`HealthInput`, `HealthMetric`, `HealthSummary`, `HealthReport`), five deterministic generators (Focus, Momentum, Flow, Stability, Completion), an orchestration engine with per-generator error isolation, Pydantic schemas, and a REST router
- `GET /sessions/{session_id}/health` — five independently-explainable categorical verdicts (never a numeric score) plus a deterministic narrative and up to 4 rule-based guidance items; returns 404 for an unknown session and 409 for a session that is not yet `COMPLETED`
- Every metric computes a raw number (always exposed in `metrics`), maps it to a fixed, named threshold band (`label`), and renders a templated headline — Focus (work-time ratio), Momentum (uninterrupted work streaks vs. idle time), Flow (topic-shift frequency), Stability (editing-cadence consistency), Completion (how the session wound down)
- Dashboard: `HealthPanel` (narrative paragraph, five fixed-order metric cards, "Worth noting" guidance list — deliberately no color-coded bands, progress bars, or leaderboard styling), `useSessionHealth` (TanStack Query hook, gated on the session being `COMPLETED`, mirroring `useSessionReplay`), wired into `SessionDetailsPage` as a fourth section below Replay
- ADR 0009 (Health Engine)

### Changed

- `apps/api/app/main.py`: registers the new `session_health` router alongside the pre-existing, unrelated infra-liveness `health` router (`GET /health`) — the two are distinct modules with distinct route prefixes, see ADR 0009 §2
- `apps/dashboard/src/pages/sessions/SessionDetailsPage.tsx`: adds a `Session Health` section, conditionally rendered only when the session's status is `COMPLETED`, with the same skeleton-loading/destructive-error treatment established for Replay in Sprint 6.5

### Documentation

- Added ADR 0009 (Health Engine), documenting the domain model, the Replay-not-Insights dependency decision (§4), the five metrics' threshold bands (§5), the guidance rule table (§6), the `health` vs. `session_health` naming-collision refinement (§2), and the deferred-caching rationale consistent with every prior engine's precedent (§10)

### Testing

- Added `test_session_health_generation.py` (pure unit tests for all five generators' threshold bands and edge cases, the guidance rule table, per-generator error isolation, and a dedicated assertion that no `score` field exists anywhere on the report — no database dependency)
- Added `test_session_health_router.py` (integration tests: 404/409 status handling, full report shape, query-count-does-not-grow-with-event-count guard; requires a live Postgres instance)
- Added `useSessionHealth.test.tsx`, `HealthPanel.test.tsx`

### Architecture

- Health is a pure projection over Timeline's `TimelineOutcome`/`TimelineEntry` and, critically, Replay's already-derived `ReplayChapter` list — zero new persisted state, zero changes to Timeline's or Replay's domain code, mirroring Insights' and Replay's own "no new table" precedent
- Health reuses Replay's own `COMPLETED`-only status gate transitively (via `replay_service.get_replay()`) rather than re-implementing it, since the Completion metric assumes a terminal `SESSION_COMPLETED` chapter always exists once past that gate
- No single composite numeric score anywhere in the model — `HealthReport.metrics` is a sparse dict of up to five independently-explainable verdicts, by explicit design constraint, not as an interim step toward a future score

### Known Limitations

- Sprint 7 intentionally excludes Redis response caching (same deferred-until-measured-need rationale as Timeline/Insights/Replay), user-configurable or adaptive threshold bands, and any cross-session or cross-developer comparison — all explicitly out of scope, not ruled out
- The new `test_session_health_router.py` integration tests require a live PostgreSQL instance and fail in environments without Docker running, consistent with the same pre-existing environmental limitation noted in every prior sprint's changelog entry
- Some Health scenarios (e.g. "Natural Wind-down") are not reachable end-to-end through the current Timeline→Replay pipeline in every configuration, so unit tests hand-build `ReplayChapter`/`TimelineEntry` fixtures directly for full generator-logic coverage rather than relying solely on driving the full pipeline

---

## [v0.5.1-product-polish]

### Added

- `ReplayView` empty state for a session with zero replay frames
- `ReplayView` completion banner ("Replay finished." + "Watch again") shown once autoplay reaches the last frame on its own — not shown for manual navigation to the last frame
- Keyboard shortcuts on the replay player (Space to play/pause, ←/→ to step, Home to restart), scoped to a focusable `role="group"` wrapper so they don't leak to the rest of the page
- Chapter-jump buttons now show each chapter's duration alongside its label
- Subtle fade-in-up entrance transition (`prefers-reduced-motion`-aware) applied to the replay player and its completion banner

### Changed

- `useReplayController` adds a `didFinish` flag: set only when autoplay runs to the last frame unassisted, cleared on `play`, `restart`, `jumpToFrame`, or `jumpToChapter`
- `SessionDetailsPage`'s Replay section now shows a skeleton pulse while loading and a dedicated destructive-styled error card on failure, matching the loading/error treatment used elsewhere on the page, instead of a single "Loading replay…" line
- Replay's playback controls, speed selector, and chapter buttons gained `role`/`aria-label`/`aria-pressed`/`aria-current`/`aria-valuetext` so screen readers can announce control grouping, active speed, active chapter, and scrubber position without relying on visual state alone

### Testing

- Added tests for the empty state, the completion banner, `aria-current`/`aria-pressed` chapter and speed markers, and keyboard shortcut handling in `ReplayView.test.tsx`
- Added tests for `didFinish`'s autoplay-only semantics and its reset on manual navigation in `useReplayController.test.tsx`

---

## [v0.5.0-replay-engine]

### Added

- Replay feature module (`apps/api/app/features/replay/`): pure domain (`render()`, mirroring Timeline's/Insights' synchronous, side-effect-free projection pattern), `ReplayFrame`/`ReplayChapter`/`Replay` dataclasses, deterministic marker + keyword-based `ChapterKind` derivation (`SESSION_STARTED`, `WORK`, `IDLE`, `RESUMED`, `SESSION_COMPLETED`), Pydantic schemas, and a REST router
- `GET /sessions/{session_id}/replay` — chronological `ReplayFrame`s (1:1 lift of Timeline's existing entries, in order) plus derived `ReplayChapter` navigation boundaries; returns 404 for an unknown session and 409 for a session that is not yet `COMPLETED`
- Chapter derivation is fully deterministic and non-AI: hard boundaries cut on Timeline's existing `SESSION_START`/`IDLE_GAP`/`SESSION_END`/`LANGUAGE_SWITCH` markers; soft boundaries cut on a 3-frame-debounced directory-shift heuristic within `WORK` stretches; labels come from an ordered keyword table (auth/config/backend) with a directory-name fallback
- Dashboard: `ReplayView` (playback controls — Restart/Previous/Play-Pause/Next — a speed selector at 1×/2×/4×/8×, a frame scrubber, and chapter-jump buttons), `useReplayController` (frame-count-driven play/pause/speed/jump state machine), `useSessionReplay` (TanStack Query hook, gated on the session being `COMPLETED`), `useSessionData` (new hook for `GET /sessions/{id}`, used solely to read session status for the gate), wired into `SessionDetailsPage` as a third section below Timeline
- `ReplayView` reuses `TimelineEntryRow` verbatim to render the current frame — zero duplicated presentation logic between Timeline and Replay, per ADR-0008 §10
- ADR 0008 (Replay Engine)

### Changed

- `apps/api/app/main.py`: registers the new `replay` router; also fixes a pre-existing CORS bug (see Fixed) discovered while browser-verifying this feature
- `apps/dashboard/src/pages/sessions/SessionDetailsPage.tsx`: adds a `Replay` section, conditionally rendered only when the session's status is `COMPLETED`

### Fixed

- **CORS: dashboard could not call the API from a real browser.** `core/config.py`'s `cors_origins: list[AnyHttpUrl]` normalizes each URL with a trailing slash on `str()` (e.g. `http://localhost:5173` → `http://localhost:5173/`), but browser `Origin` headers never carry one, and `CORSMiddleware` does an exact string match against `allow_origins`. The mismatch silently omitted `Access-Control-Allow-Origin` from every response, blocking all dashboard→API fetches in any real browser (curl was unaffected, which masked the bug from earlier `curl`-based verification). Fixed in `apps/api/app/main.py` by stripping the trailing slash: `allow_origins=[str(o).rstrip("/") for o in settings.cors_origins]`. Pre-existing, not introduced by Replay — found and fixed while performing the CLAUDE.md-mandated real-browser verification of this sprint's UI work, since it blocked verification of every dashboard page, not just Replay.

### Documentation

- Added ADR 0008 (Replay Engine), documenting the frame/chapter domain split, the deterministic non-AI chapter-derivation rules, the decision not to query Insights for chapter labeling (§4), the COMPLETED-only status gate (§5), and the deferred-caching rationale consistent with Timeline's and Insights' own precedent (§7)

### Testing

- Added `test_replay_generation.py` (pure unit tests for frame lifting and all chapter-derivation rules — hard/soft boundaries, labeling, debounce — no database dependency)
- Added `test_replay_router.py` (integration tests: 404/409 status handling, frame/chapter shape, query-count-does-not-grow-with-event-count guard; requires a live Postgres instance)
- Added `useSessionReplay.test.tsx`, `useReplayController.test.tsx`, `ReplayView.test.tsx`

### Architecture

- Replay is a pure projection over Timeline's already-computed entries, with zero new persisted state — mirrors Insights' "no new table" precedent from Sprint 5, and Timeline's from Sprint 4
- `ReplayFrame` adds two Replay-only fields (`chapter_id`, `is_chapter_start`) on top of Timeline's `metadata`/`insights` reused verbatim — Replay adds new _shape_, never new _data_
- `useReplayController` is frame-count-driven, not wall-clock-synced: each tick advances exactly one frame at an interval of `1000ms / speed`, keeping playback timing simple and testable with fake timers rather than reconstructing real inter-frame gaps

### Known Limitations

- Sprint 6 intentionally excludes Redis response caching (designed, deferred — see ADR 0008 §7), frame-level scrubbing beyond the existing scrubber input (chapter-jump is the primary navigation aid), and any Insights-informed chapter labeling — all additive future work, not ruled out
- The new `test_replay_router.py` integration tests require a live PostgreSQL instance and fail in environments without Docker running, consistent with the same pre-existing environmental limitation noted in every prior sprint's changelog entry
- The CORS trailing-slash bug fixed in this sprint was pre-existing since `core/config.py`'s `cors_origins` setting was introduced — it had gone unnoticed because prior verification relied on `curl` (unaffected by browser CORS enforcement) rather than a real browser

---

## [v0.4.0-developer-intelligence]

### Added

- Insights feature module (`apps/api/app/features/insights/`): pure domain (`DeveloperInsight`, `SessionProfile`, `InsightCategory`, 8 rule-based `InsightGenerator` implementations), orchestration engine (`build_profile()`, mirroring the Analysis Pipeline's priority-ordered, per-generator error-isolated execution model), a registry (`INSIGHT_GENERATORS`), Pydantic schemas, and a REST router
- 8 deterministic, rule-based insight categories, each with its own generator: Activity (event rate + busiest window), Files (most-edited files), Directories (most-active directories), Languages (breakdown + polyglot detection), Development Patterns (Iterative Refinement, Creation Burst, Cleanup Pass, Broad Sweep), Session Statistics, Context Switching (directory/language switch counts + longest streak), and Idle Behaviour (idle gap count/duration, derived from Timeline's `IDLE_GAP` markers)
- `DeveloperInsight` uses a `headline` / `evidence` / `metrics` shape rather than a generic `title`/`detail` pair — narrative-first by construction, and structured so future AI-generated summaries can extend the same model without a schema change
- `GET /sessions/{session_id}/profile` (full profile, grouped by category) and `GET /sessions/{session_id}/insights` (flattened list) — both computed fresh on every call, no persistence
- Dashboard: `InsightsPanel` (narrative-first rendering — headline prominent, evidence as secondary supporting text, metrics de-emphasized as small badges), `useSessionInsights` hook, wired into `SessionDetailsPage` above the existing `SessionOutcomeCard`/`TimelineView` metrics
- ADR 0007 (Developer Intelligence Engine)

### Changed

- `apps/api/app/main.py`: registers the new `insights` router
- `apps/dashboard/src/pages/sessions/SessionDetailsPage.tsx`: Insights now render first, above the Session Outcome metrics card and the raw Timeline — narrative before detail, per the approved Sprint 5 design refinement

### Fixed

- N/A for this milestone

### Documentation

- Added ADR 0007 (Developer Intelligence Engine), documenting the no-persistence decision (profiles are computed on demand; introduce persistence later only if a real performance issue appears), the `headline`/`evidence`/`metrics` field split, and the 8-category rule-based scope

### Testing

- Added `test_insights_generation.py` (pure unit tests per generator plus engine orchestration — category grouping, empty-category omission, disabled-generator skip, and error isolation — no database dependency)
- Added `test_insights_router.py` (integration tests for both endpoints, including 404-for-unknown-session and a query-count-does-not-grow-with-event-count guard; requires a live Postgres instance)
- Added `useSessionInsights.test.tsx`, `InsightsPanel.test.tsx`

### Architecture

- Insights is a pure projection over Timeline's already-computed entries/outcome, with zero new persisted state — mirrors Timeline's own "no new table" precedent from Sprint 4
- `InsightGenerator` is a `Protocol` mirroring `Analyzer` exactly (`generate() -> list[DeveloperInsight]`, no wrapper return type), and `build_profile()` mirrors `AnalysisPipeline.run()`'s per-generator try/except isolation — a failing generator never aborts the rest of the profile
- `SessionProfile.categories` omits any category that produced zero insights rather than including it with an empty list, keeping the wire payload and the dashboard's rendering logic simple

### Known Limitations

- Sprint 5 intentionally excludes persistence of generated profiles — every request recomputes from Timeline + Session; if real performance issues appear at scale, persistence should be introduced as its own optimization sprint rather than folded into this one (see ADR 0007)
- Insights recomputation duplicates one `get_session()` lookup already performed internally by `timeline_service.get_timeline()` — a small, fixed (not per-event) overhead accepted for now to keep the integration seam confined to `insights/service.py` without modifying the Timeline feature
- The new `test_insights_router.py` integration tests require a live PostgreSQL instance and fail in environments without Docker running, consistent with the same pre-existing environmental limitation noted in earlier sprint entries

---

## [v0.3.0-session-timeline]

### Added

- Timeline feature module (`apps/api/app/features/timeline/`): pure projection service (`render()`), domain types, Pydantic schemas, REST router (`GET /sessions/{session_id}/timeline`)
- `TimelineEntry` split into `metadata` (structural facts: timestamp, event type, file path, language, git branch, grouping fields, marker fields) and `insights` (analyzer findings) — keeps the entry shape extensible for future Health, AI Fingerprint, and Replay providers without growing one generic dictionary
- Semantic grouping heuristics: repeated modifications to the same file may group into a single entry; create/delete/rename operations always remain distinct entries, never merged into a group
- Session boundary and idle-gap markers (`SESSION_START`, `SESSION_END`, `IDLE_GAP`) rendered inline in entry order
- Session Outcome summary: duration, event count, distinct file count, per-language counts, largest change (file + event count, when derivable), and session summary headline
- Dashboard: `SessionDetailsPage` (route `/sessions/:sessionId`), `TimelineView`, `TimelineEntryRow`, `SessionOutcomeCard`, `useSessionTimeline` hook
- ADR 0006 (Session Timeline)

### Changed

- `apps/dashboard/src/pages/sessions/SessionRow.tsx`: session start timestamp is now a link to `/sessions/:sessionId`
- `apps/dashboard/src/App.tsx`: added the `/sessions/:sessionId` route
- `apps/dashboard/src/test/setup.ts`: added an explicit `afterEach(cleanup)` — required because `vite.config.ts`'s `test.globals: false` prevents React Testing Library's automatic cleanup from self-registering; every test file using `render()` (not just `renderHook()`) depends on this

### Fixed

- Latent test-infrastructure gap where any test file calling `render()` would leak mounted components into subsequent tests within the same file, causing duplicate-element failures — fixed globally via the `setup.ts` change above, benefiting the whole frontend test suite, not just Timeline

### Documentation

- Added ADR 0006 (Session Timeline), including an explicit "Sprint 4 Scope Exclusions" section (Replay, Timeline expansion/pagination, playback controls, AI summaries, Health calculations — all deferred, not ruled out)

### Testing

- Added `test_timeline_generation.py` (pure unit tests for grouping, markers, and outcome computation — no database dependency)
- Added `test_timeline_router.py` (integration tests, require a live Postgres instance)
- Added `useSessionTimeline.test.tsx`, `TimelineView.test.tsx`, `SessionOutcomeCard.test.tsx`

### Architecture

- Timeline is a read-only projection with no persisted state of its own — it reads events and session data through the one documented, sanctioned cross-feature import seam and computes everything at request time
- Established the metadata/insights split as the pattern future insight providers (Health, AI Fingerprint, Replay) should follow instead of adding fields to a generic dictionary

### Known Limitations

- Sprint 4 intentionally excludes Replay, Timeline expansion/pagination, playback controls, AI-generated summaries, and Health calculations — see ADR 0006's Scope Exclusions section
- The 4 new `test_timeline_router.py` integration tests require a live PostgreSQL instance and fail in environments without Docker running, consistent with the same pre-existing environmental limitation noted in the Sprint 3 entry below

---

## [v0.2.0-session-intelligence]

### Added

- Analysis feature module (`apps/api/app/features/analysis/`): `Analyzer` protocol, `AnalysisPipeline`, analyzer registry, `AnalysisRepository`, REST router (`GET /events/{event_id}/analysis`)
- Four analyzers: `LanguageAnalyzer`, `FileMetadataAnalyzer`, `GitContextAnalyzer`, `ActivityRateAnalyzer`
- Sessions feature module (`apps/api/app/features/sessions/`): lifecycle service (`touch_session`, `sweep_once`, `compute_effective_status`), `SessionSummaryGenerator` protocol with a heuristic implementation, REST router (`GET /sessions`, `GET /sessions/current`, `GET /sessions/{id}`), WebSocket router (`/ws/sessions`), connection manager
- Shared domain module `apps/api/app/core/domain/events.py` (`AnalyzableEvent`)
- Alembic migrations: `0002_create_event_analyses.py`, `0003_create_sessions.py`
- Dashboard: `SessionBanner`, `SessionRow`, `SessionsPage`, `useCurrentSession`, `useSessionsData` hooks, `/sessions` route
- Dashboard/test infra: `src/test/fake-websocket.ts`, `src/test/setup.ts`
- `.claude/launch.json` for local dev server configuration
- ADR 0004 (Analysis Pipeline Architecture), ADR 0005 (Session Engine)

### Changed

- `events/router.py`: `POST /events` now schedules the analysis pipeline as a background task and synchronously calls `session_service.touch_session()` on ingestion
- `events/service.py`: extended to support the analysis/session integration points
- `health/router.py`: expanded health checks
- `main.py`: registers the analysis and sessions routers, starts the session sweep loop in `lifespan()`
- `core/config.py`: added session timeout settings (idle/completion timeouts, sweep interval)
- `core/__init__.py`: updated exports for the new domain module
- `apps/api/.env.example`: documented new session-related environment variables
- `apps/dashboard/src/App.tsx`: added the `/sessions` route
- `apps/dashboard/src/pages/events/EventsPage.tsx`: mounted `<SessionBanner />`
- `apps/dashboard/vite.config.ts`: test configuration updates for Vitest
- `apps/dashboard/package.json`, `packages/config/package.json`, `pnpm-lock.yaml`: dependency updates for the new frontend test infrastructure

### Fixed

- N/A for this milestone (see Hardening Sprint below for fixes made between Sprint 2 and Sprint 3 work)

### Documentation

- Added ADR 0004 (Analysis Pipeline Architecture) and ADR 0005 (Session Engine)

### Testing

- Added `test_analysis_analyzers.py`, `test_analysis_pipeline.py`, `test_analysis_router.py`
- Added `test_session_router.py`, `test_session_service.py`, `test_session_summary.py`, `test_websocket_sessions.py`
- Extended `test_health.py`, `conftest.py`
- Added `useEventsFeed.test.tsx`, `ws-client.test.ts`
- Added `useCurrentSession.test.tsx`, `useSessionsData.test.tsx`

### Architecture

- Introduced the Analysis Pipeline: an `Analyzer` Protocol, priority-ordered pipeline execution, and idempotent upsert persistence (`ON CONFLICT DO UPDATE` on `(event_id, analyzer_name)`)
- Introduced the Session Engine: API-owned session boundaries independent of the daemon's own session identity, a three-state lifecycle (`ACTIVE`/`IDLE`/`COMPLETED`) enforced by lazy finalization + a periodic sweep + a pure effective-status read function
- Established `app/core/domain/` as the location for cross-feature shared types, keeping `events`, `analysis`, and `sessions` from importing each other's internals directly

### Known Limitations

- Session sweep runs as a single in-process `asyncio` loop with no distributed lock — will not scale correctly across multiple API replicas
- `sessions` has no foreign key to `development_events`; the relationship is computed by `project_root` and time range, not enforced at the database level
- Only one `SessionSummaryGenerator` implementation exists (heuristic); no AI-generated summary implementation yet
- 35 of 113 backend tests require a live PostgreSQL instance and fail in environments without Docker running (`asyncpg.exceptions.InvalidPasswordError`) — this is an environmental limitation, not a regression

---

## [v0.1.0-foundation]

### Added

- Turborepo monorepo with pnpm workspaces
- `packages/ui` (Button, Badge components with Tailwind)
- `packages/config` (type-safe env parsing utilities)
- `apps/api`: FastAPI scaffold with feature-first architecture, `health` feature (`GET /health`), `core/config.py` (pydantic-settings), `core/database.py` stub, `core/exceptions.py`
- `apps/dashboard`: React 18 + Vite + Tailwind scaffold, TanStack Query, React Router, Zustand, dark-first design tokens, placeholder dashboard page
- `apps/daemon`: Node.js + TypeScript scaffold, Chokidar-based file watcher stub, health server on port 9000
- Docker Compose infrastructure: PostgreSQL 16, Redis 7, pgAdmin, API container, with multi-stage Dockerfiles for all apps
- GitHub Actions CI pipeline (JS lint/typecheck, Python ruff, Docker build)
- Husky pre-commit hooks with lint-staged
- ADR 0001 (Monorepo Strategy), ADR 0002 (Feature-First Architecture), ADR 0003 (Event-Driven Core)
- `README.md`, `CLAUDE.md`, `ENGINEERING.md`, `DESIGN.md`
- Events feature module (`apps/api/app/features/events/`): `POST /events`, `GET /events`, `WS /ws/events`, connection manager
- Daemon: publisher abstraction (`publisher/http-publisher.ts`), event builder, language detector, git-branch detection
- Alembic migration for `development_events`
- Dashboard: Live Event Feed page (`EventsPage.tsx`) with reconnecting WebSocket client (`lib/ws-client.ts`)

### Changed

- N/A — this is the initial scaffold; nothing pre-existed to change

### Fixed

- N/A — no prior release to fix regressions against

### Documentation

- ADR 0001 (Monorepo Strategy)
- ADR 0002 (Feature-First Architecture)
- ADR 0003 (Event-Driven Core)
- `README.md`, `CLAUDE.md`, `ENGINEERING.md`, `DESIGN.md`

### Testing

- pytest + httpx async test suite for the API scaffold
- Initial test coverage for the events feature

### Architecture

- Established the feature-first backend layout (`app/features/<name>/`) with `app/core/` reserved for horizontal concerns only
- Established the event-driven core: the daemon is a pure event producer with no synchronous dependency on API-side processing
- Established the monorepo strategy: dashboard, API, and daemon in a single repository sharing tooling and event/session contracts

### Known Limitations

- No authentication or authorization anywhere in the stack
- No analysis or session logic yet — events are ingested and streamed raw, with no enrichment
- `apps/daemon`'s file watcher was a stub at this stage, not yet wired to a real publisher

## [Upcoming] — Post-v1.0

Planned work, not yet implemented: Authentication, Redis-backed Session Sweep locking for horizontal scaling, and Team Collaboration features. See `ROADMAP.md` for the full sequencing.
