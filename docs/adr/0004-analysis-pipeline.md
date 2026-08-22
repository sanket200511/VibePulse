# ADR 0004 – Analysis Pipeline Architecture

**Status:** Accepted
**Date:** 2026-07-04
**Sprint:** 2

---

## Context

Sprint 2 required an automated analysis step that runs immediately after a `DevelopmentEvent` is persisted. The analysis must:

- Be non-blocking — the daemon's 201 response must not wait for analysis to complete.
- Be pluggable — new analyzers must be addable without modifying the pipeline core.
- Be fault-tolerant — a single failing analyzer must not prevent other analyzers from running.
- Respect ADR 0002 (Feature-First) — the `analysis` feature must not import ORM models from the sibling `events` feature.
- Record execution timing per analyzer for future performance observability.

---

## Decision

### 1. BackgroundTasks dispatch (non-blocking)

Analysis is dispatched via FastAPI `BackgroundTasks` inside `POST /events`. The analysis service receives an `AnalyzableEvent` (a frozen dataclass snapshot) and a session factory reference, not the live request session. The 201 response is sent to the daemon before analysis begins.

### 2. AnalyzableEvent as the cross-feature contract

`AnalyzableEvent` lives in `app/core/domain/events.py` — a neutral location accessible to both features without creating a sibling import. It is a `@dataclass(frozen=True)`, ensuring analyzers cannot mutate the event snapshot. This satisfies ADR 0002 while giving analyzers all the data they need.

### 3. AnalysisContext for pre-fetched ambient data

Analyzers that need aggregate data (e.g., recent session activity counts) receive it via `AnalysisContext`, a frozen dataclass built before the pipeline runs. This keeps analyzers SQLAlchemy-free and trivially unit-testable: no DB session, no async, no mocking — just pure function calls.

### 4. Analyzer Protocol with metadata fields

The `Analyzer` type is a `@runtime_checkable Protocol` with:

```
name: str
version: int
description: str
priority: int
enabled: bool
analyze(event, context) -> AnalysisFinding | None
```

`priority` determines execution order (lower runs first). `enabled` allows analyzers to be turned off at construction time without removing them. Returning `None` from `analyze()` signals opt-out (no finding produced, no row written).

### 5. Pipeline separates orchestration from persistence

`AnalysisPipeline.run()` returns an `AnalysisResult` containing `AnalyzerExecution` records. It does not touch the database. `AnalysisRepository.save_result()` translates `AnalysisResult` into DB rows. This separation makes the pipeline unit-testable without a database.

### 6. Fault isolation per analyzer

Each analyzer runs inside a `try/except Exception` block. On failure, the exception message is captured in `AnalyzerExecution.error` and the pipeline continues to the next analyzer. The failure is logged at `ERROR` level.

### 7. Idempotent upserts

`event_analyses` rows are written via `INSERT … ON CONFLICT DO UPDATE` using a unique index on `(event_id, analyzer_name)`. Re-dispatching the same event overwrites previous findings rather than creating duplicates. The `ON DELETE CASCADE` FK ensures analysis rows are removed when the parent event is deleted.

### 8. Per-analyzer timing

Execution duration is measured with `time.perf_counter()` around each `analyze()` call and stored as `duration_ms: float`. This enables future dashboarding of analyzer performance without any additional instrumentation.

### 9. Raw SQL for cross-feature queries

Both `analysis/context.py` (session activity counts) and `analysis/router.py` (event existence check) use `sqlalchemy.text()` to query `development_events` tables without importing `events/models.py`, satisfying ADR 0002.

---

## Consequences

**Good:**

- New analyzers require only a class with the five metadata attributes and an `analyze()` method registered in `registry.py`.
- Pipeline unit tests need no database or async machinery.
- Fault isolation prevents a malformed file extension from blocking git branch classification.
- Upsert semantics make the pipeline safe to re-run for backfills or re-analysis.

**Bad / trade-offs:**

- `AnalysisContext` is built with a single pre-dispatch DB query; analyzers that need event-specific context (e.g., diff content) cannot access it without extending `AnalysisContext` and the context builder.
- `BackgroundTasks` runs in the same process; heavy analyzer workloads will share the API worker's CPU. A task queue (Celery, ARQ) would be needed if analysis becomes CPU-bound.
- The unique index uses `analyzer_name` (a string), so renaming an analyzer creates a new row rather than updating the existing one.

---

## Alternatives Considered

### Inline analysis (synchronous)

Rejected. Analysis adds latency that the daemon does not need. The 201 response acknowledges persistence, not analysis completion.

### Celery / ARQ task queue

Deferred. Introduces infrastructure complexity (worker process, Redis queue) not justified at current scale. The design is compatible with a future migration: replace `background_tasks.add_task()` with an enqueue call.

### Single `AnalyzerService` class (no Protocol)

Rejected. A Protocol enables multiple independent implementations and makes the contract explicit without inheritance. It also allows mock analyzers in tests without subclassing.

### SQLAlchemy-aware analyzers

Rejected. Passing a DB session into each analyzer couples them to the persistence layer, makes parallel execution more complex, and complicates unit testing. `AnalysisContext` provides the aggregate data analyzers actually need.
