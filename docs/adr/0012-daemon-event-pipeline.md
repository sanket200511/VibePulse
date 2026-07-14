# ADR 0012 — Real Filesystem Observation (Daemon PX-5.2)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-13 |
| **Sprint** | PX-5.2 |
| **Prereq** | ADR-0011 (Observation Domain Projection) |

---

## Context

PX-5.1 established that observation windows are modelled as projections over the `development_events` stream, bounded by `OBSERVATION_STARTED` and `OBSERVATION_STOPPED` events. The daemon existed as a file watcher but had no concept of observation — it published all filesystem events continuously, regardless of whether any observation window was open.

PX-5.2 implements the daemon-side counterpart: a real, scoped filesystem observation pipeline that:

1. Watches the developer's project directory continuously.
2. Publishes file events **only** while an observation window is open.
3. Guarantees deterministic event ordering via monotonic sequence numbers.
4. Handles transient API unavailability gracefully without corrupting the event stream.
5. Never reads file content.

---

## Decisions

### 1. Always-on Watcher with Boolean Observation Gate

The Chokidar watcher starts once at daemon boot and stops once at daemon shutdown. It is never recreated between observation windows.

Observation control is a boolean flag (`is_observing`) set by the control endpoint. When `false`, events are dropped after normalisation, before the debouncer. When `true`, events proceed through the pipeline.

**Why not start/stop the watcher per observation window?**
Chokidar has asynchronous teardown. Recreating the watcher on each start incurs an initial-scan warm-up period (30–500 ms on large repositories) during which filesystem events are silently missed. This creates a correctness gap at the boundary of every observation window. The boolean gate has no warm-up period and no race conditions.

### 2. Observation Windows as Pure Projections (No Event-Level Annotation)

File events carry no reference to the observation window that contains them. There is no `observation_session_id` field on `DevelopmentEvent`.

Observation windows are defined entirely by chronological boundary: all events for a given `project_root` with `timestamp > OBSERVATION_STARTED.timestamp AND timestamp < OBSERVATION_STOPPED.timestamp` belong to that window.

**Why not annotate events with the observation window identifier?**
Such an annotation recreates the `ObservationSession` persistence boundary that ADR-0011 explicitly rejected — it simply moves the coupling from the database to the event payload. The moment an identifier exists, downstream projections query by it, which re-introduces a hidden dependency on an entity that should not exist. Timestamp-range projection is sufficient, deterministic, and requires no new entity.

### 3. Daemon Sequence Numbers (`daemon_seq`)

The normaliser assigns a monotonically increasing integer (`daemon_seq`) to each event within a daemon session (`session_id`). The sequence starts at 0 on daemon startup and increments by 1 per emitted event.

`daemon_seq` is scoped to a single daemon session. It resets to 0 on daemon restart. It is stored in the `development_events` table as a nullable integer column (nullable so existing events are not invalidated by the migration).

**Purpose:**
- Secondary sort key in Replay when two events share the same `timestamp` millisecond.
- Gap detection: a consumer that receives seq 1, 2, 4 knows seq 3 was dropped.

**Scope limitation:** `daemon_seq` is meaningful for ordering events within one daemon session. It is not a global event identifier and cannot be used to order events across daemon restarts or across different developers.

### 4. Final Event Pipeline

```
Watcher → Ignore Filter → Normaliser → Observation Gate
→ Debouncer → In-Memory Queue → Priority Publisher → POST /events
```

Each stage has exactly one responsibility:

| Stage | Responsibility |
|---|---|
| Watcher | Emit raw OS filesystem events |
| Ignore Filter | Drop noise and privacy-sensitive paths |
| Normaliser | Classify, enrich, validate, sequence |
| Observation Gate | Drop events outside an observation window |
| Debouncer | Collapse file-save bursts into one event per logical save |
| In-Memory Queue | Hold publish-ready events during API outages |
| Priority Publisher | Deliver events to the API with priority-appropriate retry |

> **Design principle:** Every stage in the observation pipeline owns exactly one responsibility. New functionality should extend an existing stage only when it naturally belongs to that stage. Otherwise, introduce a new stage rather than overloading an existing one.

### 5. Debouncer

Trailing-edge, per-file, configurable window (default 300 ms). The timer resets on each burst event for the same `file_path`. The event is emitted when the timer fires, carrying the **timestamp of the first event** in the burst (the developer's actual save time) and the **event_type of the last event** (the final state of the file).

`FILE_DELETED` events bypass debouncing and are emitted immediately. Deletes are final state changes; holding them in a timer risks losing the signal if the file is recreated within the window.

### 6. In-Memory Queue

Holds debounced, publish-ready events during transient API unavailability. FIFO, configurable cap (default 500 events).

**Overflow policy:** Reject the newest incoming event. Log a structured warning including event type, file path, `daemon_seq`, and queue size. Do not drop the oldest event. The beginning of an observation window is more valuable than its tail — discarding the earliest events would corrupt the context established at observation start.

CRITICAL-priority events (`OBSERVATION_STARTED`, `OBSERVATION_STOPPED`) bypass the queue entirely. They are sent to the publisher immediately and never compete with file events for queue capacity.

### 7. Priority-Class Retry

Two priority classes:

| Class | Events | Max Retries | Behaviour |
|---|---|---|---|
| CRITICAL | `OBSERVATION_STARTED`, `OBSERVATION_STOPPED` | 10 | Never queued. Sent immediately. Logs ERROR on exhaustion. |
| NORMAL | `FILE_CREATED`, `FILE_MODIFIED`, `FILE_DELETED` | 3 | Drawn from queue. Batch retry on failure. |

Both classes use exponential backoff with a configurable base delay (default 200 ms).

**Why not tie retry counts to specific event type names?**
Priority classes decouple retry policy from event taxonomy. A new boundary event type is assigned to CRITICAL once; no conditional inside the publisher requires updating.

### 8. Ignore Rules

**Noise patterns (retained from existing implementation):**
`node_modules`, `.git`, `dist`, `build`, `coverage`, `.turbo`, `__pycache__`, `.venv`, `venv`, `.uv`, `.next`, `.nuxt`

**Noise patterns (added):**
`.DS_Store`, `Thumbs.db`, `.idea/`, `.mypy_cache/`, `.pytest_cache/`, `.ruff_cache/`, `*.swp`, `*.swo`, `*~`, `*.log`, `*.lock`, binary extensions (`.png`, `.jpg`, `.pdf`, `.zip`, `.exe`, `.dll`, `.so`, `.dylib`, et al.)

**Privacy-sensitive patterns (added):**
`.env`, `.env.*`, `.ssh/`, `.gnupg/`, `*.pem`, `*.key`, `id_rsa`, `secrets.*`

**.vscode/ is observable by default.** VSCode workspace configuration (`launch.json`, `tasks.json`, `settings.json`, `extensions.json`) represents intentional developer decisions about the project environment. Ignoring it by default would silently exclude a class of legitimate work from the Timeline.

### 9. Configuration

All operational values are configurable via environment variables. No component reads `process.env` directly — all accept a typed config object for testability.

| Variable | Default | Description |
|---|---|---|
| `DEBOUNCE_MS` | `300` | Trailing-edge debounce window (ms) |
| `QUEUE_MAX_SIZE` | `500` | Queue capacity (events) |
| `RETRY_MAX_CRITICAL` | `10` | Max retries for CRITICAL events |
| `RETRY_MAX_NORMAL` | `3` | Max retries for NORMAL events |
| `RETRY_BACKOFF_BASE_MS` | `200` | Exponential backoff base delay (ms) |

### 10. Batch Accumulator: Deferred

A batch accumulator (grouping multiple events into a single `POST /events/batch` request) was designed and evaluated. It is deferred until a real performance bottleneck is measured. The principle from ADR-0007 applies: introduce optimisation when a real problem appears, not preemptively.

The `POST /events` endpoint is unchanged. The daemon sends one event per HTTP request.

---

## Consequences

### Positive

- Single source of truth for event ordering: `timestamp` + `daemon_seq` removes ambiguity.
- Observation windows are pure projections — no new entities, no foreign keys, no annotation coupling.
- Watcher lifecycle is simple and predictable: one start, one stop, per daemon process.
- Queue overflow is explicit (logged structured warning) and preserves observation window origin.
- `.vscode/` changes are visible in the Timeline; developer intent is fully captured.
- Privacy-sensitive credentials are ignored by default; the boundary is principled.

### Negative / Accepted Limitations

- **No persistent queue:** Events in the in-memory queue are lost on daemon restart. Acceptable at current scale; persistent queuing is a future hardening sprint.
- **Single-event publishing:** No burst compression in PX-5.2. A formatter touching 50 files generates 50 HTTP requests. This is unmeasured and unoptimised; batching is deferred.
- **`daemon_seq` resets on restart:** Gap detection works within one daemon session only. Consumers must not use `daemon_seq` for cross-session ordering.
- **Privacy patterns are best-effort:** Ignore rules operate on paths, not file content. They provide a reasonable privacy default but are not a security boundary.

---

## Alternatives Rejected

### Start/stop watcher per observation window
Rejected due to async teardown races and warm-up blindspot at observation start. See Decision 1.

### `observation_session_id` annotation on file events
Rejected as a recreation of the `ObservationSession` entity that ADR-0011 explicitly rejected. See Decision 2.

### Queue before debouncer
Rejected. Pre-debounce queue holds burst events that will be collapsed by the debouncer. Post-debounce queue holds only publish-ready events. The queue's sole responsibility is outage resilience; it should contain only events that are ready to publish.

### Queue overflow: drop oldest
Rejected. Dropping the oldest event discards the observation window's origin — the earliest context of what the developer was doing. Rejecting the newest preserves that context.

### Per-event batch response (`results: [...]`)
Rejected. No current consumer uses per-event response detail. Summary counts (`accepted`, `duplicates`, `failed`) are sufficient for whole-batch retry and are O(1) regardless of batch size.

### `@parcel/watcher` replacing Chokidar
Rejected. No profiling evidence that Chokidar is a bottleneck for single-project watching. Replacing a working dependency with a native binding introduces cross-compilation risk on Windows and Docker without a measured need.

### Three-class retry (CRITICAL / NORMAL / LOW)
Rejected. No current event type warrants LOW priority behaviour. Adding a third class with no assignment is speculative abstraction.

---

## References

- ADR-0003 — Event-Driven Core
- ADR-0006 — Session Timeline
- ADR-0011 — Observation Domain Projection
