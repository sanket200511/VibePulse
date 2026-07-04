# ADR 0005 – Session Engine (Session Intelligence)

**Status:** Accepted
**Date:** 2026-07-04
**Sprint:** 3

---

## Context

Sprint 3 introduces the concept of a **Session**: one continuous period of development activity for a single project. Every `DevelopmentEvent` belongs to exactly one Session. Sessions must:

- Start automatically when activity begins, with no explicit "start" signal from the daemon.
- Remain active while events continue to arrive.
- End automatically after a period of inactivity.
- Aggregate statistics (event counts, languages, files touched) in real time.
- Produce a summary once completed.

This is the foundation for every future capability that reasons about "what happened during a period of work" — Replay, Health Score, AI Fingerprint, and Prompt Vault all consume Sessions rather than raw event history directly.

---

## Decision

### 1. The API owns session identity and lifecycle — not the daemon

The daemon generates a `session_id` once per process (`apps/daemon/src/index.ts`) and stamps it on every event. This value is **not** used as the Session's primary key and is never trusted as the authority on session boundaries — a daemon restart, a machine sleep/wake cycle, or multiple daemon processes against the same project would otherwise fragment or falsely merge sessions.

Instead:

- `Session.id` is a server-generated UUID, owned entirely by `app/features/sessions/service.py`.
- The daemon's `session_id` is stored only as `Session.daemon_session_id` — an informational hint, useful for debugging/correlation, never read by lifecycle logic.
- On every `POST /events`, `session_service.touch_session()` decides — using `project_root` and the gap since the most recent non-COMPLETED session's `last_event_at` — whether the event continues that session or starts a new one.
- The daemon remains a pure event producer. **No daemon changes are required.**

### 2. Three-state lifecycle: ACTIVE → IDLE → COMPLETED

```
 event arrives          no events for               no events for
 ──────────────►  ACTIVE ──idle_timeout──► IDLE ──completion_timeout──► COMPLETED
                     ▲                       │
                     └───── event arrives ────┘
                           (IDLE → ACTIVE)
```

- **ACTIVE** — at least one event within `session_idle_timeout_seconds` (default 300s).
- **IDLE** — silent for `>= idle_timeout` but `< idle_timeout + completion_timeout`. A dashboard-visible "might still be working" state. An event arriving while IDLE reactivates the *same* session (back to ACTIVE) — this is the whole point of the buffer.
- **COMPLETED** — silent for `>= idle_timeout + completion_timeout` (default 900s beyond idle, i.e. 1200s total silence). Terminal. A `SessionSummary` is generated at this transition. An event arriving after this point always starts a **new** session; COMPLETED sessions are never reactivated.

Two mechanisms enforce this, one lazy and one eager, so status is always correct regardless of timing:

- **Sweep loop** (`app/features/sessions/sweep.py`) — an in-process asyncio task, started from `main.py`'s existing `lifespan()` hook, polling every `session_sweep_interval_seconds` (default 30s) to persist due transitions and broadcast them over `/ws/sessions`.
- **Read-time correction** (`service.compute_effective_status()`) — a pure function that reports IDLE for an ACTIVE row whose `last_event_at` gap already exceeds the idle timeout, even if the sweep hasn't run yet. Reads are never stale by more than the query itself.
- **Lazy completion in `touch_session()`** — if a new event arrives for a project whose most recent session is old enough that it should already be COMPLETED, it is finalized on the spot before a new session is created, so a session is never silently reactivated past its terminal window.

No Redis, Celery, or APScheduler is introduced — consistent with the direct-HTTP interim documented in ADR 0003. The sweep loop is a plain `asyncio.create_task()`, safe for a single API instance.

### 3. SessionSummary behind an interface

`app/features/sessions/summary.py` defines a `SessionSummaryGenerator` Protocol (mirroring the `Analyzer` Protocol from ADR 0004): `name`, `version`, and a synchronous, side-effect-free `generate(snapshot) -> SessionSummary` method operating only on a plain `SessionSnapshot` dataclass (no DB session, no framework types).

Today's implementation, `HeuristicSessionSummaryGenerator`, computes a summary from counters the Session already maintains (no extra queries). Swapping in an AI-generated summary later means implementing the same Protocol and changing one module-level assignment (`DEFAULT_SUMMARY_GENERATOR`) — lifecycle code in `service.py` never changes.

### 4. Metrics exposed directly from the Session domain

`SessionRead.from_session()` computes `duration_seconds`, `primary_language`, and `distinct_file_count` from the Session's own aggregate counters (`events_by_type`, `languages`, `files`) and includes them in every REST/WebSocket response. The dashboard renders these fields directly; it never re-derives them from raw event history.

### 5. Database schema

New `sessions` table (migration `0003_create_sessions.py`), independent of `development_events` — no FK, mirroring the existing deliberate looseness between `development_events` and `session_id` (ADR 0003's `project_id` deferral rationale applies equally here: a stable relational key isn't justified yet). Indexes: `(project_root, status)` for the "is there an open session" lookup, and `last_event_at` for the sweep query.

### 6. API contract

```
GET  /sessions          — list recent sessions, newest activity first
GET  /sessions/current  — the current ACTIVE or IDLE session, if any
GET  /sessions/{id}     — a single session
WS   /ws/sessions        — live session.started / session.updated / session.idle / session.completed
```

### 7. Events router integration

`events/router.py` calls `session_service.touch_session()` synchronously, within the same request-scoped DB session used to persist the event — unlike analysis dispatch, this is a cheap counter update, not pipeline work, so it does not need `BackgroundTasks`. This mirrors the existing precedent of the events router as the sanctioned cross-feature integration seam (already used for `analysis_service`).

---

## Consequences

**Good:**

- Session identity is robust to daemon restarts/multiple processes — the API's own inactivity-gap logic is the single source of truth.
- The IDLE buffer gives users a natural "still working" signal before a session is called over, improving dashboard UX over a blunt ACTIVE/ENDED toggle.
- `SessionSummaryGenerator` isolates today's heuristic from tomorrow's AI-generated summary — no lifecycle code will need to change.
- Metrics live on the domain, so every future consumer (Replay, Health Score, Fingerprint, Prompt Vault) reads the same numbers the dashboard does — no duplicated calculation logic anywhere.
- No new infrastructure: same asyncio-task pattern already reserved in `main.py`.

**Bad / trade-offs:**

- The inactivity-gap heuristic can incorrectly merge two genuinely separate work sessions on the same project if they happen to fall within the combined timeout window (e.g. a lunch break shorter than 20 minutes). Accepted for Sprint 3; a future refinement could add a "split session" affordance.
- Aggregate counters (`events_by_type`, `languages`, `files`) grow unboundedly within a single very long session. Acceptable at expected event volumes; would need capping if sessions can run for days.
- The sweep loop only runs in-process; if the API restarts, sessions sit at their last persisted status until the next sweep tick or the next event's lazy-completion check — an acceptable staleness window given the 30s default interval.

---

## Alternatives Considered

### Daemon-assigned session identity (rejected)

Originally proposed treating the daemon's per-process UUID as the Session's own primary key. Rejected per explicit product direction: the daemon must remain a pure event producer, and multiple daemon processes / restarts must not be able to fragment or spoof session boundaries. The API must own this decision independently.

### Two-state lifecycle, ACTIVE ↔ ENDED (rejected)

Simpler, but collapses "recently went quiet" and "genuinely over" into one instant transition, giving the dashboard no way to show a graceful "may still be working" state. Rejected in favor of the three-state `ACTIVE → IDLE → COMPLETED` lifecycle.

### Summary computed inline in lifecycle code (rejected)

Would have coupled the finalization transition to one specific summary implementation. Rejected in favor of the `SessionSummaryGenerator` Protocol, keeping the door open for an AI-generated summary later without touching `service.py`'s state machine.

### Dashboard-side metric computation (rejected)

Would require every consumer (dashboard, and later Replay/Health/Fingerprint) to reimplement the same duration/primary-language/file-count math from raw counters. Rejected in favor of computing metrics once, on the Session domain, and shipping them in every response.
