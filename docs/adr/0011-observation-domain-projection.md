# 11. Observation Domain Projection

Date: 2026-07-13

## Status

Accepted

## Context

Sprint PX-5 establishes the **Observation Domain**. The objective was to design the domain model representing software observation so that Replay, Reflection, Health, and AI could rely on deterministic observation periods.

An initial proposal introduced a new persistence boundary (`ObservationSession` ORM model, database table, and state machine). However, this violated the core DepRadar architecture established in ADRs 0006–0009, which intentionally relies on projections over the immutable `DevelopmentEvent` stream rather than maintaining parallel state tables.

## Decision

We will model "Observation" as a projection over the `development_events` table rather than introducing a new `observation_sessions` database table or a completely separate parallel event stream.

1. **System Events**: We introduce two new event types to the `EventType` enum: `OBSERVATION_STARTED` and `OBSERVATION_STOPPED`.
2. **Observation Windows**: An observation window is defined dynamically as the set of all `DevelopmentEvents` occurring chronologically between a `STARTED` and `STOPPED` event for a given `project_root`.
3. **API Endpoints**: We provide explicit command-style endpoints (`/projects/{project_root}/observation/start` and `/projects/{project_root}/observation/stop`) which append the appropriate system event directly to the primary event stream.
4. **Time Sync**: To protect against client clock skew, we store both the client-reported `timestamp` (event_time) and a new database-level `server_received_at` timestamp.

### Why not an ObservationSession table?

Creating a dedicated `observation_sessions` table with foreign keys forces a rigid persistence boundary. It would require us to retroactively assign `observation_id`s to incoming events. If an event arrived late, or if a daemon crashed without writing a "STOP" row, we would have dangling foreign keys or ambiguous ownership.

By injecting `OBSERVATION_STARTED` and `OBSERVATION_STOPPED` directly into the `DevelopmentEvent` log, we maintain a **single immutable source of truth**.

### Preserving the Projection-First Philosophy

DepRadar is intentionally built around derivations rather than complex state mutations (ADRs 0006-0009).
- **Timeline Engine:** Can inherently render "Start/Stop" blocks perfectly because they are just regular events that occurred chronologically between file edits. No JOINs required.
- **Replay & Reflection:** Can determine exact observation bounds simply by querying the event log between these markers. They don't need to "sync" state between an `observation_sessions` table and the `development_events` table.
- **Health:** Health metrics naturally scope to the active observation windows by filtering out events that occurred outside of a `STARTED`/`STOPPED` pair.

This ensures every downstream subsystem stays perfectly aligned around the exact same event stream, eliminating race conditions or split-brain data models.

## Consequences

### Positive
* **Zero Schema Complexity**: We avoid introducing a new `observation_sessions` table and migrating foreign keys into the `development_events` table.
* **Unified Timeline**: Observation boundaries are native members of the event stream, automatically rendering on the Timeline exactly like file modifications.
* **Philosophical Alignment**: Replay and Reflection continue to operate entirely by filtering event streams, keeping the architecture purely projection-based.

### Negative
* **Query Complexity**: Extracting "currently observing" status requires querying the latest event of type `OBSERVATION_STARTED`/`STOPPED` for a project, rather than querying a simple boolean flag.
