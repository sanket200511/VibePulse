# VibePulse Demonstration Guide

---

## Demo Objective

This demo shows a live audience — professors, hackathon judges, or GitHub visitors — that VibePulse can observe real, unmodified development activity as it happens: a developer edits files, and within seconds the platform ingests the resulting events, classifies them, and rolls them up into a coherent development session with live metrics, all without VibePulse touching a single line of the code being written.

---

## Demo Flow

1. Start the backend: `cd apps/api && uv run uvicorn app.main:app --reload --port 5133`
2. Confirm the API is healthy: open `http://localhost:5133/health`
3. Start the dashboard: `pnpm --filter @vibepulse/dashboard dev` → open `http://localhost:5134`
4. Start the daemon against a sample project: `pnpm --filter @vibepulse/daemon dev` (point it at a throwaway repo, not VibePulse itself)
5. Open the sample project in an editor alongside the dashboard
6. Modify a few files — create one, edit one, delete one — across at least two languages (e.g. a `.py` and a `.ts` file)
7. Watch the **Live Event Feed** — each file change appears within ~1 second as a badged event (Created / Modified / Deleted)
8. Point out the **Analysis** enrichment already attached to each event — detected language, file category, git branch
9. Watch the **Session Banner** appear at the top of the feed — status flips to ACTIVE, event count and duration climb live
10. Stop editing and wait — after the idle timeout the banner transitions to IDLE, then COMPLETED once the completion window elapses (or narrate this if waiting live is too slow for the room)
11. Navigate to the **Sessions** page (`/sessions`) and show the completed session in the list, with its generated summary headline
12. Click into the session to open its **Session Timeline** (`/sessions/:sessionId`) — walk through the ordered, grouped entries (repeated edits to the same file collapse into one grouped entry, while creates/deletes stay distinct), point out the session start/idle/end markers, and finish on the **Session Outcome** card (duration, events, files, languages, largest change, summary)
13. Point out the **Insights** panel at the top of the same page, above the Timeline and Session Outcome card — walk through a few narrative cards (Activity, Development Patterns, Context Switching, Idle Behaviour) before the more metric-heavy ones (Files, Directories, Languages, Session Statistics), highlighting the headline/evidence/metrics structure of each card
14. Scroll down to the **Replay** section (visible only once the session is COMPLETED) — click a chapter button to jump straight to "Session Started" or "Session Completed," then hit **Play** and let it step through frames automatically, pointing out the speed selector (1×/2×/4×/8×) and the frame scrubber as alternate ways to move through the same recorded session; when playback finishes, a **Replay complete** banner appears with a "Watch again" shortcut — click it to restart from frame 1 instantly; power-users can also drive the player entirely from the keyboard (Space to play/pause, arrow keys to step, Home to restart, End to jump to the last frame)
15. Scroll down once more to the **Session Health** section — point out the five metric cards (Focus, Momentum, Flow, Stability, Completion), each showing a plain-language label and headline with its raw numbers visible underneath as badges; read the narrative paragraph at the top aloud, then, if any guidance appears, point out the "Worth noting" list — emphasize that every label is backed by inspectable numbers and there is no overall score anywhere on the panel

---

## Expected Results

- Every file save in the sample project appears in the Live Event Feed within roughly a second, with no manual refresh.
- Each event carries language and file-category metadata without any configuration — the analyzer detected it from the file extension and content.
- The Session Banner reflects the session's real state at all times: it is never stale, because the dashboard reads the same effective-status calculation the API computes on every request.
- The session lifecycle visibly progresses ACTIVE → IDLE → COMPLETED without any manual action from the presenter — this is the API's Session Engine making the call, not a button click.
- The Sessions page shows a human-readable one-line summary of what happened in the session (files touched, dominant language, duration) generated entirely server-side.
- The Session Timeline preserves semantic meaning while grouping: several saves to the same file collapse into one grouped entry, but a create, a delete, or a rename never merges into that group — each stays its own distinct entry.
- The Session Outcome card at the bottom of the timeline gives a complete-at-a-glance recap of the session (duration, events, files, languages, largest change, summary) without the presenter needing to scroll back through the whole timeline.
- The Insights panel tells the story of the session before showing any raw numbers: each card leads with a plain-language headline, backs it with supporting evidence where relevant, and lists the underlying metrics last, as small badges — narrative first, detail second.
- The Replay section only appears once a session is COMPLETED, and lets the presenter step through the exact same recorded entries shown in the Timeline, one frame at a time or on autoplay, jumping instantly to any chapter boundary — with nothing new observed or generated, just a different lens on data already captured.
- The Session Health section shows five independently-explainable metric verdicts (never a single score) plus a short narrative and, when applicable, a handful of low-stakes guidance notes — every label is backed by raw numbers visible right on the card, so nothing is asserted without evidence.

---

## Features Demonstrated

**Sprint 1**
✓ Live Event Streaming — daemon → API → WebSocket → dashboard, end to end in real time

**Sprint 2**
✓ Automatic Analysis — every event enriched with language, file metadata, git context, and activity rate, with zero manual tagging

**Sprint 3**
✓ Session Intelligence — API-owned session boundaries, a three-state lifecycle, live domain metrics, and pluggable summary generation

**Sprint 4**
✓ Session Timeline — a chronological, semantically-grouped per-session narrative with inline markers and a Session Outcome summary card

**Sprint 5**
✓ Developer Intelligence Engine — deterministic, rule-based insights across 8 categories (Activity, Files, Directories, Languages, Development Patterns, Session Statistics, Context Switching, Idle Behaviour), presented narrative-first with a headline/evidence/metrics structure, computed fresh on every request with no persisted state of its own

**Sprint 6**
✓ Replay Engine — step-by-step playback of a COMPLETED session's recorded Timeline entries, with play/pause/speed controls, a frame scrubber, and deterministic (non-AI) chapter navigation — a pure projection, no new events observed and no new state persisted

**Sprint 6.5 (Product Polish)**
✓ Improved empty, loading, and error states throughout the Replay section
✓ Replay completion experience — a "Replay complete" banner with a "Watch again" shortcut, shown only after autoplay naturally reaches the last frame
✓ Richer chapter presentation — current chapter promoted as a heading above the controls, each chapter button now shows duration
✓ Full keyboard navigation — Space/K play-pause, arrow keys step, Home restart, End jump to last frame
✓ Accessibility — ARIA roles, live region for screen-reader announcements, aria-pressed on speed buttons, aria-current on the active chapter, aria-valuetext on the scrubber
✓ Subtle frame transitions — 150 ms fade-and-lift animation when the current frame changes, skipped for reduced-motion users

**Sprint 7**
✓ Health Engine — five deterministic, rule-based metrics (Focus, Momentum, Flow, Stability, Completion) assessing a COMPLETED session's own shape, each an independently-explainable categorical verdict backed by raw numbers, plus a synthesized narrative and templated guidance — never a single score, never a comparison across sessions or developers

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

**18. What is the Session Timeline, and how is it different from the Sessions page?**
The Sessions page lists sessions with one summary line each; the Timeline is what you get by clicking into a single session — a full chronological narrative of every event in it, grouped and marker-annotated, ending in a Session Outcome card. It's a pure read-only projection: no new events or state are created, it just renders the existing session's events in a more legible order.

**19. How does the Timeline decide what to group together versus keep separate?**
Repeated modifications to the same file are eligible to group, since they represent continued work on one thing. Create, delete, and rename operations never join a group, even if they touch the same file as a nearby edit — collapsing those would hide a semantically distinct action behind a generic "×N" count, which is exactly what ADR 0006 was written to avoid.

**20. Why split `TimelineEntry` into `metadata` and `insights` instead of one flat object?**
`metadata` holds structural facts every entry has regardless of what analyzes it (timestamp, event type, file path, grouping/marker fields); `insights` holds whatever an analyzer contributes. Keeping them separate means future insight providers — Health scores, an AI Fingerprint signal, Replay annotations — can each contribute to `insights` without the entry's core shape growing indefinitely or existing consumers needing to change.

**21. What is the Developer Intelligence Engine, and how does it differ from the Timeline?**
The Timeline is a chronological projection of raw events; the Developer Intelligence Engine (Sprint 5) is a second, independent projection of the same Timeline data into a `SessionProfile` — a set of `DeveloperInsight`s grouped into 8 categories (Activity, Files, Directories, Languages, Development Patterns, Session Statistics, Context Switching, Idle Behaviour). Where the Timeline answers "what happened, in order," Insights answers "what does that mean" — e.g. "you touched 12 files but returned to `auth.py` five times," a pattern that isn't obvious from scanning a chronological list.

**22. Why `headline` / `evidence` / `metrics` instead of a generic `title` / `detail` pair?**
The three-field shape is deliberately narrative-first: `headline` is the one-sentence takeaway a developer reads first, `evidence` is optional supporting detail in plain language, and `metrics` is the underlying structured numbers, always shown last and smallest. This was chosen specifically so a future AI-generated summary layer can slot into the same shape — an LLM naturally produces a headline and supporting evidence, with metrics as the object it reasoned over — without a schema change.

**23. Why deterministic, rule-based generators instead of calling an LLM to produce insights?**
Every insight needs to be explainable and reproducible for the same session — a rule-based generator producing "you touched 12 files, 5 of them Python" is auditable and free, whereas an LLM call would add latency, cost, and non-determinism for a category of insight that plain aggregation already answers well. The generator/pipeline design (mirroring the existing Analysis Pipeline) is intentionally left open for an AI-backed generator to be added later as one more entry in the registry, not a rewrite.

**24. Why does Sprint 5 not persist insights in the database?**
Because nothing has yet demonstrated that computing them on demand is too slow — insights are a pure function of Timeline data (itself a projection of already-persisted events), so recomputing them per request keeps the architecture simple and avoids a cache-invalidation problem that doesn't exist yet. If a real session's insight computation ever becomes a measured bottleneck, persistence would be introduced then, as its own scoped optimization, rather than speculatively now.

**25. What is the Replay Engine, and what does it add over the Timeline?**
The Timeline already renders a session's events as an ordered, grouped list; Replay (Sprint 6) takes that same data and turns it into something playable — a `ReplayFrame` per Timeline entry, plus `ReplayChapter` boundaries layered on top for quick navigation (e.g. jump straight to "Session Started" or the point work resumed after an idle gap). It's a UX capability, not a new data source: no new event is observed, and no new fact about the session is computed that Timeline didn't already have.

**26. How are chapters decided, and why not use Insights or an LLM to label them?**
Chapters are fully deterministic: hard boundaries come from Timeline's own existing markers (session start/idle/end, language switch), and soft boundaries come from a simple, debounced heuristic — if the working directory shifts and stays shifted for at least 3 consecutive frames, that's a new chapter, to avoid flickering on stray one-off file touches. Labels come from an ordered keyword table (e.g. paths containing `auth` label as "Working on Authentication") with a directory-name fallback. This keeps chapters reproducible and free, consistent with the same reasoning behind Sprint 5's rule-based insights (see Q23) — an LLM-based labeler is a plausible future upgrade, not a blocker for shipping the navigation feature now.

**27. Why gate Replay on the session being COMPLETED rather than showing it live?**
Replaying a session implies there's a finished story to walk through — chapters like "Session Completed" don't exist yet for a session that's still ACTIVE or IDLE, and building a frame-by-frame player for a timeline that could still be actively growing would add real-time synchronization complexity for a feature whose value is retrospective review, not live monitoring (the Live Event Feed and Session Banner already cover that case).

**28. Why no persistence or caching for Replay yet?**
Same rationale as Insights (see Q24): Replay is a pure function of Timeline data, itself already a projection of persisted events, so nothing is lost by recomputing it per request, and no cache-invalidation problem is introduced. ADR 0008 explicitly designs a Redis-caching path for later, deferred rather than rejected, since no Redis client is wired into the FastAPI process yet — adding one purely for this would be premature infrastructure for a problem that hasn't been measured.

**29. What is the Health Engine, and why doesn't it produce a single score?**
Health (Sprint 7) answers "was this a healthy session?" — not in a productivity-scoring sense, but in terms of focus, coherence, and how naturally it wrapped up. It computes five independent metrics (Focus, Momentum, Flow, Stability, Completion) from Replay's chapters and Timeline's entries, each mapped to a fixed, named band (e.g. "Highly Focused," "Steady Pace") with its raw numbers always shown alongside. A single composite score was deliberately rejected: collapsing five different questions into one number would hide which dimension actually drove the number, and would edge toward ranking or judging a developer rather than describing a session's shape.

**30. Why does Health depend on Replay's chapters instead of re-deriving its own segmentation?**
Replay's `ReplayChapter` list already encodes the WORK/IDLE/RESUMED/structural segmentation Health needs — re-deriving that inside Health would duplicate Replay's own deterministic chapter-boundary logic. Depending on Replay's output (not its code) keeps Health a pure new consumer of already-derived structure, consistent with the same "don't redesign the upstream engine" discipline Replay itself followed with Timeline.

---

## Future Roadmap

Future milestones will build directly on the event, analysis, session, timeline, Developer Intelligence, Replay, and Health data already being captured — starting with an AI Fingerprint capability to identify AI-authored patterns, and eventually a Prompt Vault, analytics/export tooling, and production-readiness hardening (auth, multi-tenancy, deployment). Each of these will be demoed as its own milestone once implemented, using this same live-editing demo flow as the base scenario.

---

## Demo Scenario

A developer opens a fresh project in their editor, with the VibePulse daemon already watching the directory in the background. They start writing code — creating a new file, editing an existing one, deleting a stale one. They aren't doing anything different from a normal coding session; there is nothing to configure, no annotation to add, no extra step to remember.

The moment a file is saved, VibePulse observes it. The daemon detects the filesystem change, builds a structured event, and posts it to the API. Within about a second, that event appears live in the dashboard's event feed.

Behind the scenes, analysis occurs automatically: the event is enriched with its detected language, file category, git branch, and activity rate — all without the developer doing anything beyond saving a file.

As events keep arriving, the session evolves: the API's Session Engine recognizes this is a continuous burst of activity for the same project and groups the events together, keeping a running count of files touched, languages used, and elapsed time, visible live in the Session Banner.

When the developer stops — takes a break, moves to another task — the session doesn't just vanish. It transitions through IDLE and, after enough silence, to COMPLETED. At that point, a summary is generated: a short, human-readable headline describing what the session actually contained. The developer (or an observer — a teammate, a reviewer, a professor) can then open the Sessions page and see that summary sitting alongside every other session ever observed, without having written a single line of documentation themselves.

From there, clicking into the session opens its Timeline: the same raw events, now rendered as an ordered narrative — repeated saves to one file grouped together, creates and deletes kept distinct, session start/idle/end markers placed inline — ending on a Session Outcome card that recaps the whole session in one glance. Above that Timeline sits the Insights panel, telling the story of the session before any raw numbers appear: which files kept coming back, whether the pace was a steady rhythm or a scattered sweep, where the developer paused and for how long — each as a plain-language headline backed by evidence and metrics, not a dashboard of counters. Nothing here is generated by an AI model or hand-written by the developer; it's a direct, deterministic projection of the events and session data VibePulse already observed.

Below the Timeline, once the session is COMPLETED, the Replay section lets that same recorded history be walked through again — one frame at a time, at 1×/2×/4×/8× speed, or by jumping straight to a chapter like "Session Started" or "Resumed After Idle." It's the same underlying data as the Timeline above it, just given a playback interface instead of a static list — useful for a reviewer who wants to watch how a burst of AI-assisted changes actually unfolded rather than read it as a flat log.

Below Replay, the Session Health section asks a different question than any panel above it: not what happened, or how it looked played back, but whether the session itself had a healthy shape — was the work focused, did it flow without constant interruption, did it wind down naturally rather than stop abruptly. Five metrics answer that from Replay's own chapters, each landing on a plain-language label backed by its own numbers, with a short narrative tying them together and, where something stands out, a line or two of low-stakes guidance. There is no overall grade — just five honest, independently-checkable observations about one session's own shape.

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
               │
               ▼
        ┌──────────────┐
        │   Timeline    │   orders + groups entries, markers,
        │  Projection   │   Session Outcome summary
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │   Insights    │   rule-based Developer Intelligence
        │    Engine     │   Engine, 8 categories, computed fresh
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │    Replay     │   frames + deterministic chapters,
        │    Engine     │   playable projection of Timeline
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │    Health     │   five deterministic metrics over
        │    Engine     │   Replay's chapters, no score, no AI
        └──────┬───────┘
               │ REST + WebSocket
               ▼
        ┌──────────────┐
        │   Dashboard   │   live event feed + session + timeline
        │               │   + insights + replay + health view
        └──────────────┘
```

---

## Demo Checklist

Before presenting, verify:

- [ ] Local PostgreSQL is running on port 5432 and REDIS_URL is configured
- [ ] API backend has been started (`uv run uvicorn app.main:app --reload --port 5133`)
- [ ] `GET http://localhost:5133/health` returns a healthy response
- [ ] Dashboard is running and reachable at `http://localhost:5134`
- [ ] Daemon is running and pointed at a throwaway sample project — **not** the VibePulse repository itself
- [ ] The sample project is open in an editor, visible on screen alongside the dashboard
- [ ] The sample project has no uncommitted changes from a previous rehearsal (clean starting state)
- [ ] Network/Wi-Fi is stable if the demo is not fully local
- [ ] A second sample file change is prepared in advance, in case the audience wants to see it happen twice
- [ ] Browser zoom/window size is set so the event feed and session banner are both comfortably readable
- [ ] At least one prior completed session has a rich enough history (multiple files, a repeated edit, at least one create and one delete) to make the Timeline's grouping behavior visible when clicked into
- [ ] That same completed session has enough distinct chapters (e.g. an idle gap or a directory shift) to make the Replay section's chapter-jump buttons worth clicking during the demo
- [ ] That same completed session is long/varied enough that the Session Health section renders all five metric cards rather than the "not enough activity" empty state

---

## Common Failure Scenarios

**Database unavailable**
Symptom: API `/health` reports a degraded status, or requests fail with a connection error to Postgres.
Recovery: Verify that your local PostgreSQL instance is running on port 5432 and the credentials in `apps/api/.env` are correct. Start the PostgreSQL service if it is stopped.

**Daemon disconnected**
Symptom: file edits in the sample project stop appearing in the event feed.
Recovery: Check the daemon's terminal for errors first — most commonly it lost the API endpoint (wrong `.env` value) or was pointed at the wrong directory. Restart it with `pnpm --filter @vibepulse/daemon dev` and re-verify against the correct sample project path.

**WebSocket disconnected**
Symptom: the dashboard stops updating live even though the daemon is still publishing events.
Recovery: The dashboard's WebSocket client reconnects automatically with exponential backoff — wait a few seconds. If it doesn't recover, a simple browser refresh re-establishes both the REST snapshot and the WebSocket subscription cleanly.

---

## Demo Timing

**5-minute demo** — Fast, impression-focused. Cover: start the 3 terminal commands (dashboard, api, daemon), make 2–3 file changes in the sample project, point out the live event feed and the Session Banner turning ACTIVE. Skip waiting for IDLE/COMPLETED — narrate that transition instead of showing it live.

**10-minute demo** — Adds explanation. Cover everything in the 5-minute version, plus: point out the per-event analysis metadata (language, file category, git branch), explain briefly why VibePulse only observes and never generates code, and show the Sessions page with at least one previously-completed session and its generated summary (prepared in advance rather than waited for live).

**20-minute technical walkthrough** — Full architecture discussion. Cover everything above, plus: walk through the Architecture Slide diagram, explain the three-state session lifecycle and why boundaries are decided by the API rather than the daemon, open the Analysis Pipeline code briefly to show the `Analyzer` protocol and registry pattern, and leave time for audience questions — this is the format where the "Questions Professors May Ask" section above is most likely to get used live.

---

## Demo Tips

Practical recommendations for presenting VibePulse smoothly, regardless of audience:

- **Use a prepared sample project.** Demonstrate against a small, purpose-built throwaway project rather than improvising — a known set of files makes the live edits predictable and the resulting events easy to narrate.
- **Do not demonstrate using the VibePulse repository itself.** Watching VibePulse observe its own repository is confusing to an audience and risks surfacing noise from editor tooling, linters, or build artifacts unrelated to the demo narrative.
- **Increase browser zoom.** Presentation displays and video calls compress detail — raise the browser zoom level before starting so event rows, badges, and session metrics are legible from the back of a room or in a recording.
- **Keep dashboard and editor visible together.** Arrange windows so the audience can see a file change happen in the editor and its corresponding event appear in the dashboard in the same field of view — this side-by-side correlation is the core "aha" moment of the demo.
- **Disable notifications.** Turn off OS and application notifications before presenting; an unrelated pop-up during a live demo undermines credibility and distracts from the flow.
- **Keep one completed session prepared.** Waiting for a session to reach IDLE/COMPLETED live can take longer than a short demo slot allows — have a session that has already completed, with its summary generated, ready to show on the Sessions page.
- **Have backup screenshots.** Prepare screenshots of each key screen (event feed, session banner, completed session with summary) in case of a live environment failure — a screenshot-driven fallback keeps the presentation moving instead of stalling on a technical issue.
- **Keep services started before presentation.** Start the API, Dashboard, and Daemon well before the audience arrives, not as the first live step — startup time is dead air an audience shouldn't have to sit through.
- **Practice the demo timing.** Rehearse against the 5-minute, 10-minute, and 20-minute formats above at least once beforehand, with a timer, so the pacing is known rather than guessed in the moment.
- **Keep API logs visible for technical demonstrations.** For a technical audience, keep a terminal showing the API's logs on screen (or ready to switch to) — seeing the request come in and the background analysis task run reinforces the architecture explanation with real evidence, not just a diagram.
