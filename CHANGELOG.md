# Changelog

All notable changes to VibePulse are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

> **Note on versioning:** The `v0.2.0-session-intelligence` git tag currently points at the events-pipeline commit (`4cf448e`) rather than the commit that actually contains the Analysis Pipeline and Session Engine (`26cf63d`, currently `HEAD`, untagged). The entries below are grouped by what each milestone actually delivered — consistent with `PROJECT_STATUS.md` and `ROADMAP.md` — not by the tag's current git placement. The tag should be moved to `26cf63d` (or a new tag cut) to match this changelog.

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

---

## [Upcoming] — Sprint 6

Planned work, not yet implemented: a Replay Engine for step-by-step playback of a session's recorded changes, followed by the Health Engine — both deliberately excluded from Sprint 4's scope (see ADR 0006) and from Sprint 5's scope (see ADR 0007). See `ROADMAP.md` for the full sequencing.
