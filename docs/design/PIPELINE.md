# VibePulse Observation Pipeline

This document details the architecture and operational mechanics of the VibePulse Filesystem Observation Pipeline implemented during Sprint PX-5.2. It is written for future contributors, AI coding agents, and maintainers to provide a comprehensive understanding of how raw filesystem events are transformed into structured observability data.

## Pipeline Philosophy

The VibePulse observation pipeline is constructed around a strict interpretation of the **Single Responsibility Principle** applied at the architectural level. Every stage in the pipeline owns exactly one responsibility.

This philosophy improves maintainability by:

- Eliminating cross-cutting concerns (e.g., the debouncer does not know about HTTP retries).
- Isolating complexity (e.g., overflow policies live entirely within the queue).
- Ensuring testability (each stage can be tested in isolation with deterministic inputs and outputs).
- Allowing safe refactoring and composition without unintended side effects.

## Design Principles

The pipeline is governed by the following core design principles:

1. **Every stage owns exactly one responsibility.**
2. **Prefer composition over coupling.** Components are wired together via the composition root (`index.ts`) and interact through clear interfaces.
3. **Prefer projections over duplicated state.** The pipeline preserves the initial context of bursts (timestamp, sequence number) to ensure downstream projections have a true source of truth.
4. **Do not introduce speculative abstractions.** Abstractions exist only to solve immediate, proven requirements.
5. **Preserve privacy by design.** The system observes metadata, not content.
6. **Every event should become more structured as it flows through the pipeline.** Raw OS events enter; fully enriched, domain-specific `DevelopmentEvent` objects exit.

## Architecture Overview

Events flow sequentially through a unidirectional pipeline. There are no loops or bidirectional dependencies.

```
Filesystem
    │
    ▼
 Watcher
    │
    ▼
 Ignore Filter
    │
    ▼
 Normaliser
    │
    ▼
 Observation Gate
    │
    ▼
 Debouncer
    │
    ▼
 Queue
    │
    ▼
 Priority Publisher
    │
    ▼
   API
```

---

## Pipeline Stages

### 1. Watcher

- **Purpose:** Monitor the project directory for changes.
- **Responsibility:** Interface with the host operating system's filesystem events.
- **Input:** OS filesystem modifications.
- **Output:** Raw string paths and base event types (`add`, `change`, `unlink`).
- **Must NOT do:** Classify events, manage state, filter (beyond OS-level ignores), or debounce.

### 2. Ignore Filter

- **Purpose:** Discard noise at the earliest possible boundary.
- **Responsibility:** Apply a static list of regular expressions to drop irrelevant paths.
- **Input:** Raw string paths.
- **Output:** Filtered string paths (or dropped).
- **Must NOT do:** Inspect file contents, check `.gitignore` programmatically (currently), or apply dynamic rules.

### 3. Normaliser

- **Purpose:** Transform OS events into the VibePulse domain model.
- **Responsibility:** Enrich paths with metadata (language detection, relative pathing) and assign the monotonic `daemon_seq`.
- **Input:** Filtered raw paths and base event types.
- **Output:** A populated `DevelopmentEvent` object.
- **Must NOT do:** Drop events based on session state, debounce, or access the filesystem (except for minimal, bounded metadata checks).

### 4. Observation Gate

- **Purpose:** Control the flow of observation data based on the user's current session state.
- **Responsibility:** Maintain a boolean `isOpen` state. Drop events when closed; pass them through when open.
- **Input:** `DevelopmentEvent`.
- **Output:** `DevelopmentEvent` (or dropped).
- **Must NOT do:** Open/close itself autonomously, publish events, or buffer events while closed.

### 5. Debouncer

- **Purpose:** Collapse high-frequency bursts (e.g., saving a file, formatters running) into a single meaningful event.
- **Responsibility:** Perform per-file trailing-edge debouncing while preserving the timestamp and `daemon_seq` of the _first_ event in the burst, and adopting the `event_type` of the _last_.
- **Input:** `DevelopmentEvent`.
- **Output:** A single, collapsed `DevelopmentEvent`.
- **Must NOT do:** Reorder events across different files, manage a queue, or publish.

### 6. Queue

- **Purpose:** Provide resilience against transient API unavailability.
- **Responsibility:** Maintain an in-memory FIFO buffer of publish-ready events with a strict "reject-newest" overflow policy.
- **Input:** Debounced `DevelopmentEvent`.
- **Output:** `DevelopmentEvent`.
- **Must NOT do:** Retry network requests, debounce, or serialize data to disk.

### 7. Priority Publisher

- **Purpose:** Deliver events to the VibePulse API.
- **Responsibility:** Execute HTTP POST requests with priority-class exponential backoff (`NORMAL` vs `CRITICAL`).
- **Input:** Queued `DevelopmentEvent`.
- **Output:** HTTP transmission (fire-and-forget from the pipeline's perspective).
- **Must NOT do:** Queue events, collapse bursts, or inspect event contents beyond determining priority.

---

## Event Flow

1. **Detection:** A developer saves `main.ts`. The OS notifies the **Watcher**.
2. **Filtering:** The **Ignore Filter** confirms `main.ts` does not match noise patterns (like `node_modules`).
3. **Enrichment:** The **Normaliser** detects the `.ts` extension, tags the event with `language: "TypeScript"`, generates an ISO timestamp, and increments the `daemon_seq`.
4. **Gating:** The **Observation Gate** checks if a session is active. If yes, the event proceeds.
5. **Debouncing:** The **Debouncer** holds the event for a short window (e.g., 300ms). If the developer's IDE auto-formatter saves the file again 50ms later, the burst is collapsed. The first sequence number and timestamp are preserved, but the window resets.
6. **Buffering:** Once the debounce window expires, the event is pushed into the **Queue**.
7. **Delivery:** The queue immediately drains into the **Priority Publisher**, which attempts HTTP delivery. If the API returns a 503, the publisher begins exponential backoff.

## Failure Handling

- **Debounce:** If the daemon shuts down, the debouncer is synchronously flushed (`debouncer.flush()`) to ensure no in-flight burst events are lost.
- **Queue Overflow:** If the API is down and the queue reaches maximum capacity, the **Queue** employs a "reject-newest" policy. The incoming event is dropped, and a warning is logged. This preserves the beginning of the observation window, which is critical for context generation.
- **Retry Policy:** The **Priority Publisher** distinguishes between `NORMAL` file events and `CRITICAL` boundary events (`OBSERVATION_STARTED` / `STOPPED`). Both use exponential backoff, but `CRITICAL` events are granted significantly higher retry limits.
- **Gate Behavior:** When the **Observation Gate** is closed, events are dropped silently _before_ reaching the debouncer or queue. No backlog is built up while observation is disabled.

## Privacy

Privacy is maintained structurally:

- **No File Contents:** The pipeline strictly operates on file paths, extensions, and OS event types. It does not read, hash, or transmit file contents.
- **No Keystrokes:** The system reacts to filesystem modifications, not input devices.
- **No Source Code:** The daemon transmits structural metadata (e.g., "Python file modified in `/src`"), entirely avoiding source code exfiltration.
- **Metadata Only:** The `DevelopmentEvent` payload is restricted to timestamps, paths, inferred languages, and daemon sequence counters.

## Performance

- **Debounce Strategy:** By using per-file trailing-edge debouncing, the pipeline absorbs the massive event spam typical of IDEs (temporary files, formatters, auto-saves) before they consume queue capacity or network bandwidth.
- **Queue Behavior:** The queue is bounded in memory. It prevents memory leaks during prolonged API outages by strictly rejecting new items once the maximum capacity is reached.
- **Retry Philosophy:** Retries are handled asynchronously per-event inside the publisher. The pipeline does not block while waiting for a retry, nor does it crash the daemon on exhaustion.

## Future Extension Points

While adhering to "no speculative abstractions," the pipeline is designed to accommodate future growth at specific boundaries:

- **Git Integration:** Fits naturally within the **Normaliser** to enrich events with current branch or commit hash context.
- **Replay / Timeline:** Processed externally via the API, relying heavily on the uncorrupted `timestamp` and `daemon_seq` provided by this pipeline.
- **AI Insights:** Will consume the unified event stream on the backend. The pipeline ensures clean, debounced, ordered data suitable for LLM context windows.
- **Health Metrics:** Can be extracted by attaching instrumentation hooks to the **Queue** (size/overflows) and **Publisher** (retry counts) without altering their core responsibilities.

## Pipeline Invariants

The following architectural rules must be preserved by all future contributors to ensure the stability and predictability of the observation system:

- **The pipeline is strictly unidirectional.** Data flows forward; it never loops backward.
- **Stages communicate only with adjacent stages.** A component only knows about the single component it hands data to.
- **No stage may bypass another stage.** All events must flow through the entire sequence.
- **Every stage owns exactly one responsibility.** Do not mix concerns (e.g., parsing logic does not belong in the transport layer).
- **Events become progressively more structured as they move forward.** Raw OS primitives enter; domain-specific, enriched data exits.
- **Published events are immutable.** Once an event leaves the pipeline (or enters the queue), it must never be modified.
- **Privacy guarantees apply across the entire pipeline.** No stage may read file contents or record keystrokes.
- **Extend existing stages cautiously.** New functionality should extend an existing stage _only_ if it naturally belongs to that stage's single responsibility; otherwise, introduce a new stage into the composition root.
