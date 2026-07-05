# ADR 0007 – Developer Intelligence Engine

**Status:** Accepted
**Date:** 2026-07-04
**Sprint:** 5

---

## Context

Session Timeline (ADR 0006) gives a chronological, read-only narrative of a session's events. It answers *what happened, in what order*. It does not answer higher-level questions a developer actually cares about when reviewing their own work: *What kind of work was this? Which files and languages dominated? Was I focused or scattered? Did I get stuck?*

Sprint 5 introduces the **Developer Intelligence Engine** — a deterministic, rule-based layer that transforms a completed (or in-progress) session's Timeline into a `SessionProfile`: a set of categorized `DeveloperInsight`s. This is explicitly **not** AI-generated and **not** a Health score:

- No LLM or statistical model is used anywhere in this sprint — every insight is produced by a plain rule (bucketing, tallying, threshold comparison) over data the system already observed.
- No judgment of session *quality* is computed — Health (a future sprint) will build a scored assessment on top of these insights; Sprint 5 only describes, it does not grade.
- Replay and AI Fingerprint (future sprints) are expected to consume `SessionProfile` and/or contribute new `InsightCategory` generators later, without modifying this sprint's generators.

This ADR documents the three refinements applied to the original design before implementation, and the intentional exclusions kept out of Sprint 5's scope.

---

## Decision

### 1. Insights are a pure projection over Timeline, not a new stored resource

`app/features/insights/domain.py` defines the domain types (`InsightCategory`, `DeveloperInsight`, `InsightResult`, `SessionProfileInput`, `SessionProfile`) and the `InsightGenerator` Protocol, plus eight concrete, synchronous, side-effect-free generator classes — one per category. Each generator's `generate(profile_input) -> InsightResult` takes an already-rendered `Timeline` (via `SessionProfileInput.entries` / `.outcome`) as its sole input, never re-fetching or re-deriving events. This avoids duplicating Timeline's grouping/marker business rules — the Idle Behaviour generator, for example, reads Timeline's already-computed `IDLE_GAP` marker entries directly rather than recomputing an idle threshold of its own.

`app/features/insights/engine.py` provides the orchestration function `build_profile()`: filters `enabled` generators, sorts by `priority`, and runs each with per-generator try/except isolation — a failing generator is logged and skipped, never aborting the whole profile. This mirrors `AnalysisPipeline` (ADR 0004) exactly, keeping the "many independent rule engines composed by one pipeline" pattern consistent across the codebase.

`app/features/insights/service.py` is the only place that touches the database: `get_profile(db, session_id)` composes `sessions.service.get_session()` + `timeline.service.get_timeline()` into a `SessionProfileInput`, then calls `build_profile()`. No new table, no new writes, no changes to `sessions/service.py`.

### 2. Insight fields: `headline` / `evidence` / `metrics` (refinement)

The original design proposed `title` / `detail`. Renamed to a structure that reads as a narrative sentence plus its supporting facts, so a future AI-generated summary naturally extends the same model instead of requiring a parallel shape:

- **`headline`** — a plain-English, one-sentence statement of the finding (e.g. "Most active file: `service.py` (12 edits)").
- **`evidence`** — optional supporting elaboration (e.g. "8 modifications, 3 creations, 1 deletion").
- **`metrics`** — a structured `dict[str, Any]` carrying the underlying numbers for machine consumers (Replay, Health, AI Fingerprint) — never required for a human reading the headline/evidence.

This mirrors Timeline's `metadata` / `insights` split (ADR 0006 §2): a clear, typed narrative surface separate from an open-ended machine-readable bag, rather than one generic dictionary that would need renegotiating every time a new consumer appears.

### 3. No persistence in Sprint 5 (refinement)

The original design proposed persisting a computed profile onto `sessions.insights_profile` (a new JSONB column, written at the `IDLE → COMPLETED` sweep transition). This is deliberately dropped for Sprint 5: `insights/service.py::get_profile()` always computes fresh, for every session status, on every request. Zero schema migration, zero changes to `sessions/service.py::sweep_once()` / `_finalize()`.

This keeps Sprint 5's blast radius confined entirely to a new feature module. If profile computation becomes a measured performance problem at real event volumes, persistence (or caching) is a separate, later optimization sprint — introduced only once justified by evidence, not speculatively now.

### 4. Eight rule-based insight categories

`InsightCategory` (StrEnum): `ACTIVITY`, `FILES`, `DIRECTORIES`, `LANGUAGES`, `DEVELOPMENT_PATTERNS`, `SESSION_STATISTICS`, `CONTEXT_SWITCHING`, `IDLE_BEHAVIOUR`. One generator per category in Sprint 5's scope, registered in `insights/registry.py::INSIGHT_GENERATORS`, mirroring `analysis/registry.py::ANALYZERS`. Adding a ninth category later is one new class + one registry entry — no orchestration changes.

Each generator emits zero or more `DeveloperInsight`s (a generator may have nothing to say — e.g. Idle Behaviour on a session with no idle gaps still emits a positive "continuous activity" narrative insight rather than silently contributing nothing, keeping the story complete). `SessionProfile.categories` only contains keys for categories that actually produced at least one insight — an empty category is simply absent, not present with an empty list.

### 5. Dashboard: narrative first, metrics second (refinement)

The original design left ordering unspecified. `InsightsPanel` renders each `DeveloperInsight`'s `headline` prominently (as the primary line of a card) with `evidence` directly beneath it in secondary text, and `metrics` rendered last as small inline badges — detail a developer can glance at but is never forced to parse first. The panel is grouped by category, mounted below `TimelineView` on `SessionDetailsPage`, consistent with the pipeline: Session → Timeline → Insights.

### 6. API contract

```
GET /sessions/{session_id}/profile   — full SessionProfile, grouped by category
GET /sessions/{session_id}/insights  — flattened list[DeveloperInsight]
```

Both mounted as computed sub-resources of `/sessions/{id}`, mirroring Timeline's precedent (ADR 0006 §6). One `get_profile()` call backs both endpoints — same shape principle as `timeline/router.py` shaping one `get_timeline()` call two ways. Returns 404 when the session does not exist. Works for any session status.

### 7. Cross-feature import — sanctioned integration seam

`insights/service.py` imports directly from `sessions` and `timeline` feature modules, with an explicit `NOTE: intentional cross-feature import` docstring, mirroring the exact precedent set by `timeline/service.py` (ADR 0006 §8). The pure `domain.py`, `engine.py`, and `schemas.py` modules import only `timeline.domain`'s pure types (`TimelineEntry`, `TimelineEntryKind`, `TimelineMarkerKind`, `TimelineOutcome`) and `sessions.constants.SessionStatus` — never `sessions`/`timeline` service or router code.

---

## Sprint 5 Scope Exclusions

- **AI-generated insights** — every generator is deterministic and rule-based; no LLM or statistical model is used anywhere in this sprint.
- **Health scoring** — no judgment of session quality; Health is a future sprint that may consume `SessionProfile` as an input.
- **AI Fingerprint** — a future sprint that may add new `InsightCategory` generators; not built now.
- **Replay** — a future sprint; not built now.
- **Persistence/caching of computed profiles** — see refinement #3 above; deferred until justified by measured performance need.
- **Redesign of Sessions, Timeline, or existing architecture** — all prior ADRs' decisions are unchanged.

---

## Consequences

**Good:**

- Insights compose entirely on top of Timeline's existing public function — no duplicated grouping/marker logic, no new cross-cutting business rules.
- `headline` / `evidence` / `metrics` gives a natural seam for a future AI-generated summary to slot into the same shape instead of requiring a parallel model.
- Per-generator error isolation (mirroring `AnalysisPipeline`) means one buggy rule (e.g. a divide-by-zero in Context Switching) degrades gracefully instead of failing the whole profile.
- Zero schema change and zero persistence keeps Sprint 5's blast radius small and easily revertable.
- Registry + Protocol pattern means a ninth category is additive, not a refactor.

**Bad / trade-offs:**

- Every request recomputes the full profile — acceptable at current event volumes (same trade-off Timeline already accepts, ADR 0006 §"Bad"), but will need revisiting (caching or persistence) if sessions grow very large or profile computation becomes measurably expensive.
- Pattern-detection thresholds (creation burst size, broad-sweep window, etc.) are fixed heuristic constants, not user-configurable or adaptive.
- Because nothing is persisted, historical profiles are not comparable across time for a session that is still being actively appended to — each call reflects "as of now," not a frozen snapshot.

---

## Alternatives Considered

### Persist `SessionProfile` on `sessions.insights_profile` (rejected for Sprint 5)

Would avoid recomputation on every request, but adds a schema migration and a write path into `sessions/service.py`'s finalize/sweep logic before there is any evidence recomputation is actually expensive. Rejected per the explicit refinement — introduce persistence later as a dedicated optimization sprint if real performance issues appear.

### `title` / `detail` field names (rejected)

Functionally equivalent to `headline` / `evidence`, but doesn't signal the narrative-summary intent as clearly for future AI-generated content to extend. Rejected in favor of `headline` / `evidence` / `metrics`.

### Insights feature re-deriving events directly instead of consuming Timeline (rejected)

Would let Insights skip Timeline's rendering step, but would duplicate grouping and marker business rules (semantic grouping, idle-gap threshold, language-switch detection) in a second place, risking drift between the two. Rejected in favor of taking the already-rendered `Timeline` as input.
