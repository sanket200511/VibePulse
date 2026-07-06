# ADR 0009 – Health Engine

**Status:** Accepted
**Date:** 2026-07-05
**Sprint:** 7

---

## Context

Foundation, the Event Pipeline, the Analysis Pipeline, the Session Engine, Session Timeline (ADR 0006), the Developer Intelligence Engine (ADR 0007), and the Replay Engine (ADR 0008) are complete. A developer can see a session's chronological narrative (Timeline), its rule-based interpretation (Insights), and step through it frame-by-frame (Replay) — but none of these answer the most basic reflective question a developer might ask after a session ends: **"was this a healthy session?"**, not in a productivity-scoring sense, but in the sense of focus, coherence, and how naturally it wrapped up.

Sprint 7 introduces the **Health Engine** — a fifth downstream projection, sitting after Replay in the request-time pipeline. It reuses Timeline's `TimelineOutcome`/`TimelineEntry` and, critically, **Replay's `ReplayChapter` list** as its primary input, so it can be built as a pure aggregation over already-derived structure without re-deriving idle detection, grouping, or chapter boundaries itself.

Health is explicitly **not**:

- A productivity score, developer rating, or leaderboard metric — it evaluates *sessions*, never developers.
- AI-generated — every metric is arithmetic over already-derived Timeline/Replay structure; no LLM or statistical model appears anywhere in this sprint.
- A comparison to any other session or developer — every metric is computed from one session's own data only.

This ADR documents the design (approved prior to implementation) and the refinements applied along the way.

---

## Decision

### 1. Health is a pure projection over Timeline + Replay, not a new stored resource

`app/features/session_health/domain.py` defines `HealthInput` (`outcome`, `chapters`, `entries`) as the sole input to five pure generator functions, and `app/features/session_health/engine.py::build_health_report()` as the orchestration entry point — synchronous, side-effect-free, no I/O. `app/features/session_health/service.py::get_health()` is the only place that touches the database (via `replay_service.get_replay()` and `timeline_service.get_timeline()`), mirroring Replay's and Insights' precedent exactly.

### 2. Naming collision — `health` vs. `session_health` (refinement)

The original design proposed `apps/api/app/features/health/`. In practice, `apps/api/app/features/health/` already existed prior to Sprint 7 as the infrastructure liveness-check module (`GET /health`, used by Docker healthchecks). Rather than merge the new Session Health Engine into that module — which would conflate an infra-liveness concern with a domain-projection concern, and would force the liveness router to depend on Timeline/Replay — the new feature module was named `apps/api/app/features/session_health/` instead. Both routers are registered side-by-side in `main.py` (`health_router` unchanged, `session_health_router` new), and the REST path is `GET /sessions/{session_id}/health` (mounted under `/sessions`, not `/health`), so there is no route collision either. `session_health` is tagged `tags=["session_health"]` in OpenAPI to keep the two clearly distinguishable.

### 3. `HealthCategory`, `HealthMetric`, `HealthGenerator`, `HealthInput`, `HealthSummary`, `HealthReport` (domain model)

- **`HealthCategory`** (StrEnum) — exactly `FOCUS`, `MOMENTUM`, `FLOW`, `STABILITY`, `COMPLETION`. Unlike Insights (0–N insights per category), Health produces **exactly one `HealthMetric` per category or none at all** — each category answers one specific question about the session, not an open-ended list of observations.
- **`HealthMetric`** — mirrors `DeveloperInsight`'s `headline`/`evidence`/`metrics` split exactly, plus `label` (a fixed, named threshold band, e.g. "Highly Focused", "Natural Wind-down"). `metrics` always exposes the raw numbers behind `label` — a label is never presented without its evidence being inspectable.
- **`HealthGenerator`** (Protocol) — `generate(health_input) -> HealthMetric | None`. Returns `None` (not a fabricated value) when the session has insufficient signal (e.g. too short, no work chapters, fewer than two stability buckets).
- **`HealthInput`** — `outcome: TimelineOutcome`, `chapters: list[ReplayChapter]`, `entries: list[TimelineEntry]`. Deliberately does **not** take `SessionProfile` (Insights) — see §4.
- **`HealthSummary`** — `narrative: str` (a deterministic space-joined concatenation of the five generators' headlines, in fixed category order) and `guidance: list[str]` (0–4 templated, rule-based observations, capped at `HEALTH_MAX_GUIDANCE_ITEMS = 4`).
- **`HealthReport`** — `session_id`, `generated_at`, `metrics: dict[HealthCategory, HealthMetric]` (sparse — a category is absent only if its generator returned `None`), `summary`. **No numeric score field anywhere on this model or on `HealthMetric`/`HealthSummary`** — verified directly by a dedicated test (`test_no_score_field_anywhere_on_report`) asserting neither object has a `score` attribute.

### 4. Why Health depends on Replay, not Insights

Health's five questions are all about the *shape* of the session over time — focus, streaks, coherence, cadence, ending. `ReplayChapter` already segments the session into exactly the `WORK`/`IDLE`/`RESUMED`/structural pieces this needs, deterministically derived once in Sprint 6. Re-deriving that segmentation inside Health (by reading raw Timeline markers again) would duplicate Replay's chapter logic — a violation of "don't redesign Replay" by proxy. Depending on Replay's *output* (not its code) is the correct seam. Insights, by contrast, produces narrative text and per-file/per-language rollups — useful color, but not structural segmentation — so Health doesn't consult it as an input.

### 5. The five metrics — fixed threshold bands over raw numbers, never a weighted blend

Every metric computes a raw number (always shown in `metrics`), maps it to a fixed, named threshold band (`label`), and renders a templated headline from the raw number. No metric is a weighted blend of other metrics, and no metric compares this session to any other session or developer. Implemented in `app/features/session_health/generators.py`:

- **FOCUS** — `focus_ratio = sum(work_chapter_durations) / outcome.duration_seconds`. Bands: `≥0.80` Highly Focused, `≥0.55` Focused, `≥0.30` Fragmented, else Scattered.
- **MOMENTUM** — merges adjacent `WORK`/`RESUMED` chapters (no `IDLE` between them) into streaks; `momentum_index = avg_streak_seconds / (avg_streak_seconds + avg_idle_seconds)`. Bands: `≥0.85` Strong Momentum, `≥0.60` Steady Momentum, `≥0.35` Choppy, else Frequently Interrupted. Returns `None` if there are no streaks at all.
- **FLOW** — counts adjacent `(WORK, WORK)` chapter-pair transitions as topic shifts; `shifts_per_hour = topic_shift_count / (outcome.duration_seconds / 3600)`. Bands: `≤1.0` Highly Coherent, `≤3.0` Coherent, `≤6.0` Fragmented Focus, else Scattered Across Topics.
- **STABILITY** — buckets content entries (`EVENT`/`GROUP`, summed by `group_size`) inside `WORK`/`RESUMED` chapter time ranges into fixed 5-minute (`HEALTH_STABILITY_BUCKET_SECONDS = 300.0`) windows; `cv = population_stdev(bucket_counts) / mean(bucket_counts)`. Bands: `≤0.40` Steady Pace, `≤0.80` Variable Pace, else Erratic Pace. Returns `None` if fewer than two buckets exist ("not enough data" rather than a fabricated verdict).
- **COMPLETION** — inspects the chapter immediately preceding the terminal `SESSION_COMPLETED` chapter. `IDLE` chapter ≥60s (`HEALTH_COMPLETION_IDLE_THRESHOLD`) before completion → Natural Wind-down; `WORK`/`RESUMED` immediately before → Concluded Mid-Work; otherwise (only `SESSION_STARTED` precedes) → Ended Immediately. Headlines here are fixed per label, not number-templated, since this metric is categorical by nature — but `metrics` still carries `preceding_chapter_kind`/`preceding_chapter_duration_seconds` so the label remains inspectable.

### 6. Guidance — a small ordered rule table over categorical labels, not raw numbers

`engine.py::derive_guidance()` runs as a second orchestration phase after all five generators, matching on the already-computed `label`s (never raw numbers, never free-text generation) — mirroring the conditional-insight style of Insights' pattern generators. Rules, in priority order: flow fragmentation (`Fragmented Focus`/`Scattered Across Topics`) → momentum interruption (`Frequently Interrupted`) → completion mid-work (`Concluded Mid-Work`) → stability erratic (`Erratic Pace`) → focus+momentum combo (`Highly Focused` + `Strong Momentum`/`Steady Momentum`). Every guidance string is phrased about **the session's shape**, never about the developer (e.g. "This session moved across many different areas of work" — not "you got distracted").

**Refinement noted during testing:** rules #2 (momentum interruption) and #5 (focus+momentum combo) both key off `MomentumHealthGenerator`'s single `label` value and are mutually exclusive — a session's momentum label can never simultaneously be "Frequently Interrupted" and "Strong Momentum"/"Steady Momentum". In practice, at most 4 of the 5 rules can ever fire together, making `HEALTH_MAX_GUIDANCE_ITEMS = 4` a defensive ceiling rather than a limit ever actually reached by a literal 5-rule match. This is not a bug — the cap remains correct as a safety margin against future rule-table growth.

### 7. Per-generator error isolation

`build_health_report()` runs each of the five registered generators (priority-ordered via `HEALTH_GENERATORS`, `registry.py`) through `_run_one()`, which catches and logs (`health_generator_error`) any exception a generator raises, exactly like `insights/engine.py`'s `_run_one()`. One failing generator does not abort the report — verified by `test_failing_generator_does_not_abort_others`.

### 8. Session status gate — COMPLETED only

`GET /sessions/{session_id}/health` returns **409 Conflict** for a session whose status is not `COMPLETED`. This is enforced transitively: `session_health/service.py::get_health()` calls `replay_service.get_replay()` first, which already raises `ConflictError` for non-`COMPLETED` sessions (ADR 0008 §5) — Health reuses Replay's own gate rather than re-implementing it, since the Completion metric assumes a terminal `SESSION_COMPLETED` chapter always exists once past that gate.

### 9. API contract

```
GET /sessions/{session_id}/health — five metric verdicts + a narrative/guidance summary
```

Mounted as a computed sub-resource of `/sessions/{id}`, mirroring Timeline/Insights/Replay. Returns 404 when the session does not exist, 409 when it exists but is not yet `COMPLETED`. A single endpoint was sufficient — unlike Insights (which offers both a grouped and flattened shape deliberately), Health's `metrics` dict is already small (5 keys) and doesn't need an alternate view.

### 10. Performance — no persistence, no caching, recompute-on-request

Health pays for one Timeline computation and one Replay computation (both already `O(n)` single-pass over already-fetched events/analyses — no new queries beyond what Replay/Timeline already cost), plus a pure in-memory aggregation over `chapters` and one bucketing pass over `entries` for Stability. This is strictly cheaper than Replay's own render, since chapters are already computed by the time Health runs. No Redis client is wired into `app/main.py` yet, and introducing one now — before any measured evidence of a bottleneck — would repeat the exact premature-infrastructure mistake Replay's ADR (0008 §7) explicitly declined to make. Verified with a query-count regression test (`test_health_query_count_does_not_grow_with_event_count`) asserting the SELECT count is identical for a 2-event and a 10-event session.

### 11. Cross-feature import — sanctioned integration seam

`session_health/service.py` imports directly from `replay` and `timeline` feature modules, with the same `NOTE: intentional cross-feature import` docstring convention used by `timeline/service.py`, `insights/service.py`, and `replay/service.py`. The pure `session_health/domain.py` and `generators.py` import only `replay.domain`'s and `timeline.domain`'s pure types — never `replay`'s or `timeline`'s service or router code.

### 12. Dashboard — Session → Timeline → Insights → Replay → Health

Health is a fourth section on `SessionDetailsPage` (no new route), gated on `isCompleted` exactly like Replay. `useSessionHealth` mirrors `useSessionReplay`'s hook shape (`useQuery` keyed `["sessions", sessionId, "health"]`, `staleTime: Infinity` since a `COMPLETED` session's health cannot change). `HealthPanel` renders: (1) `summary.narrative` as a plain paragraph with no numeric score displayed anywhere near it; (2) five metric cards in a fixed grid, always ordered FOCUS → MOMENTUM → FLOW → STABILITY → COMPLETION (never sorted by "best"/"worst"), each with a uniformly-styled outline `Badge` for `label` (deliberately not color-coded by band, since color-coding a session's own shape as "good/bad" edges toward productivity judgment), the `headline`, optional `evidence`, and raw `metrics` as small badge chips; (3) a plain `<ul>` guidance list headed "Worth noting" (deliberately not "Recommendations" — low-stakes phrasing), omitted entirely when empty. Each metric card is wrapped in `role="group"` with `aria-label` combining category + label (e.g. `"Focus: Highly Focused"`), matching Replay's `role="group"` accessibility pattern (ADR 0008 §10 UI notes).

---

## Sprint 7 Scope Exclusions

- **Redesign of Timeline** — Health consumes `timeline_service.get_timeline()` unchanged; zero changes to `timeline/domain.py`, `timeline/service.py`, or `timeline/schemas.py`.
- **Redesign of Replay** — Health consumes `replay_service.get_replay()` unchanged; zero changes to `replay/domain.py`, `replay/service.py`, or `replay/schemas.py`.
- **AI/ML of any kind** — every metric is arithmetic over already-derived Timeline/Replay structure; no LLM, no statistical model.
- **Cross-session or cross-developer comparison** — every metric is computed from one session's own data only.
- **A single composite "health score"** — five independently-explainable categorical verdicts plus a narrative, never a number out of 100.
- **Persistence or caching** — computed fresh per request, same as every prior engine in this codebase.
- **Leaderboards, streaks-as-achievements, or badges-as-rewards** — `Badge` is used purely as a label-display primitive, uniformly styled, never as a "you earned this" affordance.

---

## Extensibility

`HealthReport` is a small, stable, fully-deterministic feature vector: five categorical labels plus their raw numeric evidence (`focus_ratio`, `momentum_index`, `shifts_per_hour`, `cv`, `preceding_chapter_kind`, etc.). A future `ai_fingerprint` feature module would be a new, separate feature (per ADR-0002) that reads `HealthReport` (and optionally `SessionProfile` from Insights) via its own service-layer composition — the same cross-feature-import-in-service-layer pattern already used by Insights, Replay, and now Health. Health's domain code itself never needs to know Fingerprint exists. Because every `HealthMetric` carries its own `generator_version`, a future consumer can detect when a metric's computation logic changed and re-derive/invalidate anything it cached from an older version, the same versioning discipline `DeveloperInsight.generator_version` already established.

---

## Consequences

**Good:**

- Zero duplicated business logic — all five metrics read Replay's already-derived chapter structure rather than re-deriving idle detection, grouping, or boundary rules.
- Every generator being pure and synchronous makes metric derivation exhaustively unit-testable without a database, exactly like Timeline, Insights, and Replay.
- The naming-collision discovery (§2) was caught and resolved before any router registration conflict occurred, at the cost of a slightly less clean module name (`session_health` vs. the originally-planned `health`).
- The `HEALTH_MAX_GUIDANCE_ITEMS` cap (§6) is a safety margin rather than a load-bearing limit given the current rule table's mutual exclusivity — verified explicitly by test rather than left as an unstated assumption.

**Bad / trade-offs:**

- Fixed threshold-band constants (`HEALTH_FOCUS_HIGH`, `HEALTH_MOMENTUM_STRONG`, etc.) are not user-configurable or adaptive — a session that's borderline between two bands gets a single label with no indication of how close it was to the next band (though the raw number in `metrics` always makes this inspectable).
- Recomputes on every request (no caching) — acceptable at current volumes per the same trade-off already accepted for Timeline/Insights/Replay, revisit if measured load justifies it.
- Some Health scenarios (e.g. "Natural Wind-down") are not reachable end-to-end through the current Timeline→Replay pipeline in every configuration (Timeline's `render()` does not detect an idle gap between the last content entry and `session_ended_at`), so unit tests hand-build `ReplayChapter`/`TimelineEntry` fixtures directly for full generator-logic coverage rather than relying solely on driving the full pipeline — an intentional test-design choice, not a defect in Health itself.

---

## Alternatives Considered

### Merging Session Health into the existing `apps/api/app/features/health/` liveness module (rejected)

Would avoid introducing a second `*health*`-named module, but would conflate an infra-liveness concern (used by Docker healthchecks, has zero dependencies) with a domain-projection concern (depends on Timeline and Replay). Rejected in favor of the sibling `session_health` module (§2); both routers coexist in `main.py` with distinct route prefixes and OpenAPI tags.

### Consulting `SessionProfile` (Insights) as a Health input (rejected)

Insights produces narrative text and per-file/per-language rollups, not structural segmentation. Health's five questions are all about session *shape* over time, which `ReplayChapter` already encodes. Adding an Insights dependency would cost a second, unused round-trip for data Health doesn't need — the same reasoning Replay itself applied when dropping Insights as an input (ADR 0008 §4).

### A single composite numeric health score (rejected, non-negotiable per Sprint 7 constraints)

Would be simpler to display ("87/100") but collapses five independently-meaningful, differently-shaped signals into one number that inevitably reads as a productivity judgment — directly contradicting the explicit constraint that Health must never judge, rank, or compare developers. Rejected outright; five categorical verdicts plus a narrative is the permanent design, not an interim step toward a future score.
