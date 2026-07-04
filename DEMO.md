# VibePulse Demonstration Guide

---

## Demo Objective

This demo shows a live audience — professors, hackathon judges, or GitHub visitors — that VibePulse can observe real, unmodified development activity as it happens: a developer edits files, and within seconds the platform ingests the resulting events, classifies them, and rolls them up into a coherent development session with live metrics, all without VibePulse touching a single line of the code being written.

---

## Demo Flow

1. Start Docker infrastructure: `docker compose up -d` (Postgres, Redis, pgAdmin, API container)
2. Confirm the API is healthy: open `http://localhost:8000/health`
3. Start the dashboard: `pnpm --filter @vibepulse/dashboard dev` → open `http://localhost:5173`
4. Start the daemon against a sample project: `pnpm --filter @vibepulse/daemon dev` (point it at a throwaway repo, not VibePulse itself)
5. Open the sample project in an editor alongside the dashboard
6. Modify a few files — create one, edit one, delete one — across at least two languages (e.g. a `.py` and a `.ts` file)
7. Watch the **Live Event Feed** — each file change appears within ~1 second as a badged event (Created / Modified / Deleted)
8. Point out the **Analysis** enrichment already attached to each event — detected language, file category, git branch
9. Watch the **Session Banner** appear at the top of the feed — status flips to ACTIVE, event count and duration climb live
10. Stop editing and wait — after the idle timeout the banner transitions to IDLE, then COMPLETED once the completion window elapses (or narrate this if waiting live is too slow for the room)
11. Navigate to the **Sessions** page (`/sessions`) and show the completed session in the list, with its generated summary headline

---

## Expected Results

- Every file save in the sample project appears in the Live Event Feed within roughly a second, with no manual refresh.
- Each event carries language and file-category metadata without any configuration — the analyzer detected it from the file extension and content.
- The Session Banner reflects the session's real state at all times: it is never stale, because the dashboard reads the same effective-status calculation the API computes on every request.
- The session lifecycle visibly progresses ACTIVE → IDLE → COMPLETED without any manual action from the presenter — this is the API's Session Engine making the call, not a button click.
- The Sessions page shows a human-readable one-line summary of what happened in the session (files touched, dominant language, duration) generated entirely server-side.

---

## Features Demonstrated

**Sprint 1**
✓ Live Event Streaming — daemon → API → WebSocket → dashboard, end to end in real time

**Sprint 2**
✓ Automatic Analysis — every event enriched with language, file metadata, git context, and activity rate, with zero manual tagging

**Sprint 3**
✓ Session Intelligence — API-owned session boundaries, a three-state lifecycle, live domain metrics, and pluggable summary generation

---

## Talking Points

VibePulse exists because AI-assisted coding has changed how software actually gets written — a single developer can now produce, in an afternoon, the volume of code that used to take a team a sprint, but the tools we use to _understand_ that code haven't caught up. Version control tells you what changed; it doesn't tell you how a session unfolded, whether the pace was healthy, or whether a burst of AI-generated code introduced patterns nobody actually reviewed.

The problem VibePulse solves is visibility, not generation. It deliberately does not write or suggest code — it observes. That's an important distinction to make explicit to a technical audience: this is an observability platform, structurally closer to an APM tool like Datadog than to a coding assistant like Copilot.

Developer observability matters for the same reason production observability does: you cannot manage what you cannot measure, and "how is this codebase actually evolving" has historically been answered by gut feel and code review, not data. As AI-assisted development accelerates the rate of change, that gap between what's happening and what's visible only widens — which is exactly the gap VibePulse's Session Engine and Analysis Pipeline are built to close.

---

## Questions Professors May Ask

**1. What is the overall architecture of VibePulse?**
A daemon observes the filesystem and publishes raw events; a FastAPI backend ingests them, runs them through an analysis pipeline, and groups them into sessions via the Session Engine; a React dashboard consumes both REST and WebSocket APIs to show it live.

**2. Why FastAPI instead of Django or Flask?**
FastAPI gives native async support end-to-end (ingestion, DB access via SQLAlchemy's async engine, WebSockets) and Pydantic-based request/response validation, which matters for a system that's mostly I/O-bound event ingestion rather than a traditional CRUD app.

**3. Why is the architecture "feature-first" instead of the typical MVC layout?**
Each feature (events, analysis, sessions) owns its own router, schema, service, and models under `app/features/<name>/`, with no cross-feature imports of internals. This keeps features independently understandable and deletable, and it's documented as a formal decision in ADR 0002.

**4. How does the frontend stay in sync with the backend in real time?**
Each page does one initial REST fetch for existing data, then opens a WebSocket subscription for live updates — no polling. A reconnecting WebSocket client with exponential backoff handles dropped connections transparently.

**5. Why WebSockets instead of polling or Server-Sent Events?**
The dashboard needs low-latency, bidirectional-capable updates for multiple concurrent broadcast channels (events, sessions); WebSockets are natively supported by FastAPI and pair well with a connection-manager pattern for fan-out to multiple connected clients.

**6. Why PostgreSQL specifically?**
It's a mature, ACID-compliant relational database with strong JSON support (JSONB columns are used for flexible fields like `events_by_type` and `languages`), and it pairs with SQLAlchemy 2.x's async engine cleanly via `asyncpg`.

**7. Why does the Session model use JSONB columns instead of separate normalized tables for things like `languages` or `files`?**
Those fields are aggregate counters/sets that only the owning session ever reads or writes as a whole — there's no independent query need to join into them, so JSONB avoids needless join complexity for data that's inherently document-shaped.

**8. What is the Analysis Pipeline, and how is it extensible?**
It's a pipeline of independent `Analyzer` implementations (language, file metadata, git context, activity rate) conforming to a shared Protocol. Adding a new analyzer means writing one class and registering it — the pipeline, persistence, and API surface don't change.

**9. How does VibePulse decide where one coding session ends and another begins?**
The API's Session Engine — not the daemon — makes that decision, by comparing the gap between an incoming event's timestamp and the project's last known event against two configurable timeouts (idle and completion). The daemon's own session identity is stored only for debugging and is never trusted for lifecycle decisions.

**10. Why not just trust the daemon's own session ID?**
A daemon restart, an editor crash, or multiple daemon instances could produce inconsistent or duplicate session identities. Centralizing the decision in the API means session boundaries are consistent regardless of what's happening on the client machine — this is a deliberate architectural decision recorded in ADR 0005.

**11. Why three states (ACTIVE/IDLE/COMPLETED) instead of just two (ACTIVE/COMPLETED)?**
IDLE gives the product a clear, honest middle state — a developer who paused to think or take a call isn't "done," but they're also not actively coding. It also makes COMPLETED unambiguous and terminal, avoiding awkward reactivation semantics a two-state model would need.

**12. How are those state transitions actually triggered?**
Three mechanisms work together: a periodic in-process sweep loop that persists due transitions, a pure `compute_effective_status()` function that reports the true status at read time even if the sweep hasn't run yet, and lazy finalization inside the event-ingestion path itself so a very late event can never silently reactivate an old session.

**13. What is the "AI Fingerprint" feature planned for the future, and how would it work?**
It's a planned capability (not yet implemented) to detect statistical or stylistic signatures characteristic of AI-generated code — for example, unusually uniform commit cadences or code patterns — to help teams understand how much of a codebase was AI-assisted and where. It would build on the event and session data already being collected, not require new observation infrastructure.

**14. Is the summary generation AI-powered right now?**
No — Sprint 3 ships a heuristic summary generator (duration, dominant language, event count) behind a `SessionSummaryGenerator` interface specifically so an AI-generated implementation can be swapped in later without touching any lifecycle code.

**15. How would this system scale to many concurrent projects or users?**
The current design deliberately avoids adding infrastructure it doesn't yet need — no Redis-backed queues, no distributed locks — because a single-instance API is sufficient at current scale. The known scaling gap, documented honestly as technical debt, is that the session sweep loop assumes a single API process; running multiple replicas would require a distributed lock or moving the sweep to an external scheduler.

**16. Why is there no authentication yet?**
It's an explicit, scoped-out decision for the current phase — the project is focused on proving the observability model end to end before adding multi-user/auth concerns, which would be a separate, orthogonal piece of work.

**17. How is correctness verified given there's no live AI model involved?**
Through automated tests at each layer — analyzer unit tests, session-service tests for lifecycle transitions, router/integration tests, and frontend hook tests using a fake WebSocket double — plus architecture decisions recorded in ADRs so design intent doesn't rely on tribal memory.

---

## Future Roadmap

Future milestones will build directly on the event, analysis, and session data already being captured — starting with a Session Timeline that turns raw session data into a scrollable per-session narrative, followed by a Replay Engine to reconstruct how a codebase evolved step by step, a Health Engine to score sessions and projects on complexity and consistency, an AI Fingerprint capability to identify AI-authored patterns, and eventually a Prompt Vault, analytics/export tooling, and production-readiness hardening (auth, multi-tenancy, deployment). Each of these will be demoed as its own milestone once implemented, using this same live-editing demo flow as the base scenario.

---

## Demo Scenario

A developer opens a fresh project in their editor, with the VibePulse daemon already watching the directory in the background. They start writing code — creating a new file, editing an existing one, deleting a stale one. They aren't doing anything different from a normal coding session; there is nothing to configure, no annotation to add, no extra step to remember.

The moment a file is saved, VibePulse observes it. The daemon detects the filesystem change, builds a structured event, and posts it to the API. Within about a second, that event appears live in the dashboard's event feed.

Behind the scenes, analysis occurs automatically: the event is enriched with its detected language, file category, git branch, and activity rate — all without the developer doing anything beyond saving a file.

As events keep arriving, the session evolves: the API's Session Engine recognizes this is a continuous burst of activity for the same project and groups the events together, keeping a running count of files touched, languages used, and elapsed time, visible live in the Session Banner.

When the developer stops — takes a break, moves to another task — the session doesn't just vanish. It transitions through IDLE and, after enough silence, to COMPLETED. At that point, a summary is generated: a short, human-readable headline describing what the session actually contained. The developer (or an observer — a teammate, a reviewer, a professor) can then open the Sessions page and see that summary sitting alongside every other session ever observed, without having written a single line of documentation themselves.

---

## Architecture Slide

```
        ┌──────────────┐
        │   Developer  │
        │  writes code │
        └──────┬───────┘
               │ file save
               ▼
        ┌──────────────┐
        │    Daemon    │   watches filesystem, no code awareness
        └──────┬───────┘
               │ POST /events
               ▼
        ┌──────────────┐
        │      API      │   ingests + persists event
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │   Analysis    │   language, metadata, git, activity
        │   Pipeline    │
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │    Session    │   groups events, tracks lifecycle,
        │    Engine     │   generates summary
        └──────┬───────┘
               │ REST + WebSocket
               ▼
        ┌──────────────┐
        │   Dashboard   │   live event feed + session view
        └──────────────┘
```

---

## Demo Checklist

Before presenting, verify:

- [ ] Docker Desktop (or engine) is running
- [ ] `docker compose up -d` has been run and all containers are healthy (`docker compose ps`)
- [ ] `GET http://localhost:8000/health` returns a healthy response
- [ ] Dashboard is running and reachable at `http://localhost:5173`
- [ ] Daemon is running and pointed at a throwaway sample project — **not** the VibePulse repository itself
- [ ] The sample project is open in an editor, visible on screen alongside the dashboard
- [ ] The sample project has no uncommitted changes from a previous rehearsal (clean starting state)
- [ ] Network/Wi-Fi is stable if the demo is not fully local
- [ ] A second sample file change is prepared in advance, in case the audience wants to see it happen twice
- [ ] Browser zoom/window size is set so the event feed and session banner are both comfortably readable

---

## Common Failure Scenarios

**Docker not running**
Symptom: `docker compose up -d` fails, or containers exit immediately.
Recovery: Start Docker Desktop (or the Docker daemon), then re-run `docker compose up -d`. Confirm with `docker compose ps` that Postgres, Redis, pgAdmin, and the API container all show `healthy`/`running` before continuing.

**Database unavailable**
Symptom: API `/health` reports a degraded status, or requests fail with a connection error to Postgres.
Recovery: Check `docker compose ps` for the Postgres container's state; if it's still starting, wait a few seconds and retry — the API's `pool_pre_ping` will recover automatically once Postgres is reachable. If the container isn't running, restart it with `docker compose up -d postgres`.

**Daemon disconnected**
Symptom: file edits in the sample project stop appearing in the event feed.
Recovery: Check the daemon's terminal for errors first — most commonly it lost the API endpoint (wrong `.env` value) or was pointed at the wrong directory. Restart it with `pnpm --filter @vibepulse/daemon dev` and re-verify against the correct sample project path.

**WebSocket disconnected**
Symptom: the dashboard stops updating live even though the daemon is still publishing events.
Recovery: The dashboard's WebSocket client reconnects automatically with exponential backoff — wait a few seconds. If it doesn't recover, a simple browser refresh re-establishes both the REST snapshot and the WebSocket subscription cleanly.

---

## Demo Timing

**5-minute demo** — Fast, impression-focused. Cover: start Docker + dashboard (pre-started before the audience arrives if possible), make 2–3 file changes in the sample project, point out the live event feed and the Session Banner turning ACTIVE. Skip waiting for IDLE/COMPLETED — narrate that transition instead of showing it live.

**10-minute demo** — Adds explanation. Cover everything in the 5-minute version, plus: point out the per-event analysis metadata (language, file category, git branch), explain briefly why VibePulse only observes and never generates code, and show the Sessions page with at least one previously-completed session and its generated summary (prepared in advance rather than waited for live).

**20-minute technical walkthrough** — Full architecture discussion. Cover everything above, plus: walk through the Architecture Slide diagram, explain the three-state session lifecycle and why boundaries are decided by the API rather than the daemon, open the Analysis Pipeline code briefly to show the `Analyzer` protocol and registry pattern, and leave time for audience questions — this is the format where the "Questions Professors May Ask" section above is most likely to get used live.
