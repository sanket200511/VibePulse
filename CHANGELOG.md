# Changelog

All notable changes to VibePulse are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

> **Note on versioning:** The `v0.2.0-session-intelligence` git tag currently points at the events-pipeline commit (`4cf448e`) rather than the commit that actually contains the Analysis Pipeline and Session Engine (`26cf63d`, currently `HEAD`, untagged). The entries below are grouped by what each milestone actually delivered — consistent with `PROJECT_STATUS.md` and `ROADMAP.md` — not by the tag's current git placement. The tag should be moved to `26cf63d` (or a new tag cut) to match this changelog.

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

## [Upcoming] — Sprint 4

Planned work, not yet implemented: a Session Timeline view in the dashboard, turning the event and session data already being collected into a chronological, per-session narrative — laying groundwork for the later Replay Engine and Health Engine milestones. See `ROADMAP.md` for the full sequencing.
