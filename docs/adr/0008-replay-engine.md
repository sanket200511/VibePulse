# ADR 0008 – Replay Engine

**Status:** Accepted
**Date:** 2026-07-04
**Sprint:** 6

---

## Context

Foundation, the Event Pipeline, the Analysis Pipeline, the Session Engine, Session Timeline (ADR 0006), and the Developer Intelligence Engine (ADR 0007) are complete. A developer can see a session's chronological narrative (Timeline) and its rule-based interpretation (Insights), but both are read top-to-bottom, all at once. There is still no way to **step through** a completed session the way it actually unfolded.

Sprint 6 introduces the **Replay Engine** — a deterministic playback of a completed session's already-computed Timeline, one step at a time, grouped into human-legible chapters. Replay is explicitly **not**:

- Screen recording, IDE recording, or video playback — nothing about the developer's screen or editor is ever captured.
- A new source of truth — it observes/re-presents Timeline's existing entries; it computes zero new facts about *what happened*.
- AI-generated — chapter derivation is markers, path-prefix keyword matching, and a debounce counter; no LLM or statistical model appears anywhere in this sprint.

This ADR documents the design (approved prior to implementation) and the refinements applied along the way.

---

## Decision

### 1. Replay is a pure projection over Timeline, not a new stored resource

`app/features/replay/domain.py` defines `render(entries: list[TimelineEntry], *, session_id, generated_at) -> Replay` — synchronous, side-effect-free, no I/O. It performs two things over an already-rendered `Timeline.entries` list: (a) lifts every `TimelineEntry` into a `ReplayFrame` 1:1, in existing order, and (b) derives `ReplayChapter` boundaries and labels over that same sequence. `app/features/replay/service.py::get_replay()` is the only place that touches the database, mirroring Timeline's and Insights' precedent exactly.

A `ReplayRenderer`/`ReplayController` split (frontend state machine vs. presentation) was designed but is a client-side concept only — there is no backend equivalent, no `ReplayState` table, and no "resume where I left off" persistence. Reloading the page restarts playback at frame 0, same as a video player with no resume feature.

### 2. `ReplayFrame` / `ReplayChapter` / `Replay` (domain model)

- **`ReplayFrame`** — `id` (= the source `TimelineEntry.id`), `index`, `timestamp`, `kind` (reused `TimelineEntryKind`), `metadata`/`insights` (reused verbatim, no copy/transform), plus two Replay-only fields: `chapter_id` and `is_chapter_start`. This is the only place Replay adds new *shape* — it adds zero new *data*.
- **`ReplayChapter`** — a named, contiguous span of frame indices: `label`, `kind` (`ChapterKind`), `start_frame_index`/`end_frame_index`, `start_timestamp`/`end_timestamp`, `duration_seconds`, `summary_metrics`. Chapters are a derived navigation index, not a source of behavior — deleting the chapter layer would not change what a session *did*.
- **`Replay`** — `session_id`, `frames: list[ReplayFrame]`, `chapters: list[ReplayChapter]`, `generated_at`. Analogous to `Timeline` (entries + outcome): no behavior beyond holding data.

### 3. Chapter generation — deterministic, marker + keyword based (no AI)

`ChapterKind` (StrEnum): `SESSION_STARTED`, `WORK`, `IDLE`, `RESUMED`, `SESSION_COMPLETED`.

**Hard boundaries**, always cut on Timeline's existing markers — zero new heuristics needed, just re-labeling existing structural facts as chapter edges:

- `SESSION_START` → a standalone 1-frame `SESSION_STARTED` chapter.
- `IDLE_GAP` → a standalone 1-frame `IDLE` chapter; the very next frame opens a `RESUMED` chapter that lasts until the next hard boundary (kept simple/predictable — a `RESUMED` chapter is not further subdivided by the soft directory-shift rule below).
- `SESSION_END` → closes the current chapter, opens a terminal `SESSION_COMPLETED` chapter.
- `LANGUAGE_SWITCH` → closes the current chapter, opens a new `WORK` chapter starting at the switch marker. Reuses Timeline's own marker directly rather than re-deriving language-shift detection.

**Soft boundaries**, only within `WORK` stretches: a run of `CHAPTER_DIRECTORY_SHIFT_MIN_RUN` (3) consecutive content frames sharing a new dominant directory (via `TimelineMetadata.file_path`) that differs from the chapter's established directory cuts a new `WORK` chapter starting at the first frame of that run. The debounce (3 frames) exists specifically so one stray file doesn't produce a 1-frame chapter.

**Labeling** — a `WORK`/`RESUMED` chapter's label is chosen by matching its non-marker frames' file paths against an ordered keyword table (`auth`/`login`/`session`/`jwt`/`oauth` → "Authentication Work"; `config`/`.env`/`settings`/`docker` → "Configuration Changes"; `api/`/`backend/`/`server/` → "Backend Refactor"), falling back to `"{dominant_directory} Changes"` when nothing matches, and `"Session Activity"` when a chapter happens to contain no file paths at all (e.g. an empty span between two markers). `RESUMED` chapters always use the fixed label "Resumed" regardless of content — the label's purpose there is to flag "the developer came back," not to re-describe the work. `SESSION_STARTED`/`IDLE`/`SESSION_COMPLETED` use fixed labels.

Every rule above is a marker lookup, a path-prefix match, or a consecutive-run counter — fully unit-testable with synthetic event sequences, no model call, no non-determinism.

### 4. Refinement — Insights is not queried in Sprint 6

The original design sketched Replay consulting `SessionProfile` (Insights) as chapter-labeling signal. In practice, the label heuristic above only needs `TimelineEntry.metadata.file_path` — data Replay already has from Timeline directly. Calling `insights_service.get_profile()` would add a second DB round-trip (session lookup + Timeline generation, repeated) for a return value the labeling logic doesn't use. Dropped for Sprint 6: `replay/service.py` calls `timeline_service.get_timeline()` only. The `summary_metrics` bucket on `ReplayChapter` remains open for a future Insights-informed labeling refinement (see §7, Extensibility) without any schema change.

### 5. Session status gate — COMPLETED only

`GET /sessions/{id}/replay` returns **409 Conflict** for a session whose status is not `COMPLETED`. Replaying an in-progress session would be racing against new events arriving mid-playback; that use case is Timeline's live view, not Replay. This check lives in `replay/router.py` (an HTTP-shape concern), not `replay/domain.py` — `render()` itself has no opinion on session status.

### 6. API contract

```
GET /sessions/{session_id}/replay — chronological frames + derived chapters
```

Mounted as a computed sub-resource of `/sessions/{id}`, mirroring Timeline (ADR 0006 §6) and Insights (ADR 0007 §6). Returns 404 when the session does not exist, 409 when it exists but is not yet `COMPLETED`.

### 7. Performance — no persistence, no continuous polling, recompute-on-request (refinement)

The original design proposed a Redis response cache (`docker-compose.yml` already provisions Redis) keyed by `session_id`, justified by a completed session's Timeline being immutable. This is **deferred for Sprint 6**, for the same reason Timeline and Insights both deferred caching/persistence at their own introduction (ADR 0006 §"Bad", ADR 0007 §3): no Redis client is actually wired into the FastAPI process yet (`app/main.py`'s lifespan handler explicitly notes this), and introducing one now — before there is measured evidence Replay's recomputation is a real bottleneck — would be exactly the kind of premature infrastructure CLAUDE.md and prior ADRs argue against. Replay inherits Timeline's existing two-query bound (session lookup + events range query + analyses bulk lookup are already paid for; `render()` itself is pure in-memory `O(n)` list processing) and adds zero additional queries of its own now that Insights is not consulted (§4).

"Replay should never query the database continuously" is satisfied primarily on the **client**: the dashboard fetches the `Replay` payload exactly once per page visit (`useSessionReplay` = one TanStack Query call with `staleTime: Infinity`, since a `COMPLETED` session's replay cannot go stale), and every Play/Pause/Next/Speed/Jump interaction afterward is pure client-side state over the already-fetched payload — zero additional requests during playback. If profiling later shows repeated-request load from many viewers of the same popular session, a Redis cache is a additive, backward-compatible optimization sprint, not a Sprint 6 requirement.

### 8. No frame persistence

Per the explicit constraint, no new Postgres table stores computed frames or chapters. `Replay` is computed fresh per request from Timeline's already-persisted data, exactly like Insights' `SessionProfile`.

### 9. Cross-feature import — sanctioned integration seam

`replay/service.py` imports directly from `sessions` and `timeline` feature modules, with the same `NOTE: intentional cross-feature import` docstring convention used by `timeline/service.py` (ADR 0006 §8) and `insights/service.py` (ADR 0007 §7). The pure `replay/domain.py` imports only `timeline.domain`'s pure types (`TimelineEntry`, `TimelineEntryKind`, `TimelineMarkerKind`) — never `timeline`'s or `sessions`'s service or router code.

### 10. Dashboard — Session → Overview → Timeline → Replay

Replay is a third section on the existing `SessionDetailsPage` (no new route) — a `ReplayView` mounted below `TimelineView`, reusing `TimelineEntryRow`'s existing per-entry rendering so a frame looks exactly like its Timeline row, one at a time. Layout: current-frame content, a chapter scrubber (segments proportional to `duration_seconds`, click-to-jump), and a five-control bar (Play/Pause, Restart, Previous/Next Chapter, Speed). No entrance/exit animations, no auto-scroll, no sound — only the frame swap (a brief cross-fade) and the scrubber position indicator move, both disabled entirely under `prefers-reduced-motion`.

`ReplayController` (a `useReplayController` hook) owns the ticking: on Play, it advances `currentFrameIndex` on a timer scaled by the real gap between consecutive frame timestamps and the selected speed multiplier, capped at a fixed max per-step wait so a long idle gap doesn't make playback literally wait through it — the `IDLE` chapter's `duration_seconds` communicates the real gap in the UI instead.

---

## Sprint 6 Scope Exclusions

- **Redesign of Timeline** — Replay consumes `timeline_service.get_timeline()` unchanged; zero changes to `timeline/domain.py`, `timeline/service.py`, or `timeline/schemas.py`.
- **Redesign of Sessions** — Replay consumes `session_service.get_session()` unchanged; zero new fields, zero new lifecycle states.
- **AI-generated chapters or labels** — every rule is deterministic (marker lookup, path-prefix keyword match, consecutive-run counter).
- **Browser/screen/IDE recording** — Replay is entirely derived from data already in Postgres via Timeline; nothing about the developer's screen or editor is touched.
- **Frame-level scrubbing/drag-seek** — v1 navigation is chapter-granularity only (Previous/Next/Jump to Chapter); a finer-grained scrubber is additive future work.
- **Redis response caching** — designed but deferred; see §7.
- **Health, AI Fingerprint, Prompt Vault integration** — future sprints; see Extensibility below.

---

## Extensibility

- **Health** — a future scorer would be an optional third service call in `replay/service.py`, consumed by chapter labeling as an additional signal feeding the existing `summary_metrics` dict — no change to `ReplayFrame`/`ReplayChapter`/`Replay` shapes.
- **AI Fingerprint** — would surface via `TimelineInsights.analyzer_findings` on the underlying `TimelineEntry`, which `ReplayFrame.insights` already exposes verbatim (Replay doesn't need to know what produced the signal).
- **Prompt Vault** — a future prompt-capture feature would appear as a new `TimelineEntryKind`/marker kind upstream in Timeline; Replay's frame-lifting step is already generic over `TimelineEntryKind` and needs no changes to accept it.

The general principle, consistent with Timeline → Insights: **new systems extend the open `dict[str, Any]` buckets or add new marker/entry kinds upstream in Timeline — they never require Replay's core dataclasses to grow new required fields.**

---

## Consequences

**Good:**

- Zero duplicated business logic — chapter derivation reads Timeline's existing markers/metadata rather than re-deriving grouping, idle-gap, or language-switch rules.
- `render()` being pure and synchronous makes chapter derivation exhaustively unit-testable without a database, exactly like Timeline and Insights.
- Dropping the Insights call (§4) keeps Replay's query cost identical to Timeline's, not additive.
- The frame/chapter split mirrors Timeline's metadata/insights split precedent: a stable, low-level fact layer (`ReplayFrame`) with a derived, potentially-revisable interpretation layer (`ReplayChapter`) on top.

**Bad / trade-offs:**

- `CHAPTER_DIRECTORY_SHIFT_MIN_RUN` (3) and the keyword label table are fixed heuristic constants, not user-configurable or adaptive.
- Recomputes on every request (no caching) — acceptable at current volumes per the same trade-off already accepted for Timeline/Insights, revisit if measured load justifies it.
- Chapter labels are heuristic and can be wrong for unconventional directory layouts (e.g. a monorepo where `api/` isn't backend code) — accepted as an honest limitation of a keyword-based, non-AI approach, consistent with the sprint's explicit "no AI" constraint.
- `RESUMED` chapters are not subject to the directory-shift soft-split rule (kept simple/predictable), so a long `RESUMED` chapter can span multiple directories without further subdivision until the next marker.

---

## Alternatives Considered

### Persisting computed `Replay` frames/chapters to a new table (rejected)

Would avoid recomputation, but adds a migration and a write path before there is any evidence recomputation is measurably expensive — the same reasoning Timeline (ADR 0006) and Insights (ADR 0007) already applied. Rejected for Sprint 6; revisit as a dedicated optimization sprint if justified.

### Redis-caching the computed `Replay` response (designed, deferred)

Technically sound (a completed session's Timeline is immutable, so cache invalidation is a non-issue), but requires wiring an actual Redis client into the FastAPI process, which does not exist yet (`app/main.py` explicitly documents this gap). Deferred until either Redis wiring lands for another reason or Replay's request volume actually warrants it.

### Consulting `SessionProfile` (Insights) for chapter labeling (rejected for Sprint 6)

Originally designed as the source of labeling signal. In implementation, the keyword-based heuristic only needs `TimelineEntry.metadata.file_path`, which Replay already has from Timeline directly — calling Insights would add a second, unused round-trip. Rejected in favor of a local heuristic in `replay/domain.py`; the door remains open for genuine `SessionProfile`-informed labeling later (see Extensibility).

### Subjecting `RESUMED` chapters to the same directory-shift soft-split as `WORK` (rejected)

Would make "Resumed" chapters behave identically to any other content chapter, but loses the explicit signal that "the developer came back after being away" — a fact more useful to surface as one chapter, even if it spans multiple directories, than to fragment immediately. Rejected in favor of a simpler, more predictable rule: `RESUMED` lasts until the next hard (marker) boundary.
