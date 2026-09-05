# ADR 0006 – Session Timeline

**Status:** Accepted
**Date:** 2026-07-04
**Sprint:** 4

---

## Context

Foundation, the Event Pipeline, the Analysis Pipeline, and the Session Engine are complete. A developer can see live events and a Session's aggregate counters, but there is still no way to answer, for one completed (or in-progress) Session: **what happened, when, in what order, and what changed?**

Sprint 4 introduces the **Session Timeline** — a chronological narrative view over a Session's events, enriched with analysis findings. The Timeline is explicitly **not** Replay:

- Replay (a future sprint) will let a developer step through and re-experience a session.
- Timeline only renders a read-only, already-computed narrative of history. No playback, no scrubbing, no step controls.

This ADR also documents two refinements applied to the original design before implementation, and the intentional exclusions kept out of Sprint 4's scope.

---

## Decision

### 1. Timeline is a pure projection, not a new stored resource

`app/features/timeline/domain.py` defines a synchronous, side-effect-free `render()` function: `(events, analyses, session_started_at, session_ended_at, session_summary) -> Timeline`. It performs no I/O and owns all business logic — ordering, grouping, marker insertion, and outcome computation. `app/features/timeline/service.py` is the only place that touches the database; it fetches a Session's events and their analyses, then calls `render()`. No new table, no new writes. This mirrors the Analysis Pipeline's separation of pure computation (`analyzers/`) from I/O (`service.py`), per ADR 0004.

A `TimelineRenderer` Protocol was deliberately **not** introduced — there is exactly one rendering strategy today, and CLAUDE.md's guidance against premature abstraction argues against copying the `Analyzer` Protocol pattern until a second implementation is actually needed.

### 2. TimelineEntry splits into `metadata` and `insights` (refinement)

Rather than one generic dictionary that would grow indefinitely as future capabilities (Health, AI Fingerprint, Replay) attach more data to each entry, a `TimelineEntry` carries two separate, purpose-built pieces:

- **`TimelineMetadata`** — structural, observed facts: timestamp, event type, file path, language, git branch, grouping info (`group_size`, `group_span_seconds`, `member_event_ids`), and marker info (`marker_kind`, `marker_detail`).
- **`TimelineInsights`** — interpretive signal derived from the Analysis Pipeline: `analyzer_findings`, keyed by analyzer name.

Future insight providers (a Health scorer, an AI Fingerprint classifier) extend `TimelineInsights` with new fields or keys without touching `TimelineMetadata` or any existing consumer that only reads structural facts. This split is mirrored exactly in the wire schema (`TimelineEntryRead.metadata` / `.insights`).

### 3. Semantic grouping — not just file + time proximity (refinement)

A naive heuristic ("same file, close in time → group") would conflate structurally different operations. Only `FILE_MODIFIED` events may group together; `FILE_CREATED` and `FILE_DELETED` always remain standalone entries, even when adjacent in time to modifications on the same file. Two consecutive `FILE_MODIFIED` events group when they touch the same `file_path` and the gap between them is `<= GROUP_GAP_SECONDS` (30s). This preserves the meaning of "a file was created" or "a file was deleted" as a distinct, visible moment in the narrative rather than folding it into a same-file edit cluster.

(The codebase's `EventType` enum has exactly three values — `FILE_CREATED`, `FILE_MODIFIED`, `FILE_DELETED` — there is no rename event to reason about yet.)

### 4. Markers punctuate the narrative

Beyond event/group entries, `render()` inserts marker entries for:

- `SESSION_START` — always first.
- `SESSION_END` — only when the session has actually ended (`session_ended_at is not None`); an in-progress session's timeline simply stops at its most recent entry.
- `IDLE_GAP` — inserted when the gap since the previous entry's end is `>= IDLE_GAP_SECONDS` (120s).
- `LANGUAGE_SWITCH` — inserted when consecutive entries' languages differ (never fires before the first entry).

### 5. Session Outcome card (refinement)

`TimelineOutcome` (wire: `SessionOutcomeRead`) summarizes the session as a whole: `duration_seconds`, `event_count`, `distinct_file_count`, `primary_language`, `languages` (per-language event counts), `largest_change`, and `session_summary`.

`largest_change` is the most-edited file by event count, and is `null` whenever no file was touched more than once — DepRadar has no file-content or line-diff signal anywhere in the pipeline (confirmed against `analysis/analyzers/file_metadata.py`), so "largest change" is defined honestly as "most-edited file," not invented from data the system doesn't have.

`session_summary` is `Session.summary` (already a plain dict produced by the Session Engine's `HeuristicSessionSummaryGenerator`, ADR 0005 §3) passed through unchanged — Timeline does not recompute or reinterpret it.

### 6. API contract

```
GET /sessions/{session_id}/timeline — chronological narrative + Session Outcome
```

Mounted as a computed sub-resource of `/sessions/{id}`, mirroring the existing precedent of `GET /events/{event_id}/analysis` (a computed sub-resource, not an independently stored one). Returns 404 when the session does not exist. Works for any session status — ACTIVE/IDLE sessions render using "now" as the effective end and simply omit the `SESSION_END` marker.

### 7. Performance — two queries, independent of event count

`service.get_timeline()` issues exactly two data queries regardless of how many events a session has: one range query for the session's events (`project_root` + `timestamp` between session start and end/now), and one bulk `IN (...)` lookup for those events' analyses. There is no per-event query. Covered by an integration test that asserts the SELECT count for a 2-event session equals the SELECT count for a 10-event session.

### 8. Cross-feature import — sanctioned integration seam

`timeline/service.py` imports directly from `events`, `analysis`, and `sessions` feature modules, with an explicit `NOTE: intentional cross-feature import` docstring. This mirrors the existing precedent (`events/router.py` already imports `analysis` and `sessions` services). Timeline's entire purpose is composing data across these three features into a read-only view, so the service layer is the correct, contained seam — the pure `domain.py` and `schemas.py` modules import nothing from sibling features.

---

## Sprint 4 Scope Exclusions

The following are explicitly **not** part of this ADR or Sprint 4, to keep the Timeline focused:

- **Replay** — stepping through / re-experiencing a session. A future sprint builds this on top of Timeline.
- **Timeline expansion** — collapsing/expanding grouped entries in the UI.
- **Playback controls** — play/pause/scrub of any kind.
- **AI summaries** — the Session Outcome card passes through the existing heuristic summary; it does not generate new narrative text.
- **Health calculations** — no scoring or judgment of session quality.
- **Redesign of Sessions or existing architecture** — the Session lifecycle, schema, and API from ADR 0005 are unchanged.

---

## Consequences

**Good:**

- `TimelineMetadata` / `TimelineInsights` gives future insight providers (Health, AI Fingerprint) a clear extension point without a generic, ever-growing dictionary.
- Semantic grouping keeps create/delete operations visible as distinct moments, rather than disappearing into a same-file edit cluster.
- Two-query generation means Timeline scales to long sessions without an N+1 risk.
- `render()` being pure and synchronous makes it exhaustively unit-testable without a database.
- `largest_change` and `session_summary` are both honest about what the system can actually derive — no invented metrics.

**Bad / trade-offs:**

- `GROUP_GAP_SECONDS` (30s) and `IDLE_GAP_SECONDS` (120s) are fixed heuristic constants, not user-configurable or adaptive to a developer's individual pace.
- Grouping is scoped to `FILE_MODIFIED` only; if a future event type is added (e.g. a rename), grouping rules will need explicit reconsideration rather than falling out automatically from the existing heuristic.
- The Timeline recomputes on every request rather than being cached or persisted — acceptable at current event volumes given the two-query bound, but would need revisiting if sessions grow very large.

---

## Alternatives Considered

### Single generic `TimelineEntry.data: dict[str, Any]` (rejected)

Simpler initially, but every future insight provider (Health, AI Fingerprint, Replay) would need to reach into an untyped, ever-growing dictionary with no clear ownership boundary between "what was observed" and "what was inferred." Rejected in favor of the `metadata` / `insights` split.

### Grouping by file + time proximity alone (rejected)

Would have grouped a `FILE_CREATED` immediately followed by `FILE_MODIFIED` edits on the same file into one cluster, losing the meaningful "this file was just created" moment. Rejected in favor of restricting grouping to `FILE_MODIFIED`-only, same-file, same-gap-window sequences.

### `TimelineRenderer` Protocol mirroring `Analyzer` (rejected for now)

Would follow the Analysis Pipeline's precedent, but with only one rendering strategy in existence, introducing the abstraction now would be speculative. Rejected per CLAUDE.md's guidance against designing for hypothetical future requirements; revisit if a second rendering strategy is actually needed.

### Importing `sessions.schemas`/`sessions.summary` dataclasses into `timeline/domain.py` (rejected)

`Session.summary` is already a plain `dict[str, Any]`. Importing sessions' typed dataclasses into Timeline's pure domain/schema layer would add a cross-feature dependency where none is needed — those layers do no I/O and don't require typed access to another feature's internals. Rejected in favor of a raw dict passthrough, confined to `service.py`, the already-sanctioned integration seam.
