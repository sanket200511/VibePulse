# Live Observability Engine (ADR / Overview)

## Context

DepRadar observes software engineering through a combination of file system events (from the daemon) and background analysis pipelines. Prior to this, the dashboard required manual refreshes to see new sessions, architecture timeline updates, or project intelligence stats.

Sprint PX-9.5 introduced the **Live Observability Engine** to connect these capabilities seamlessly, rendering the platform a living, breathing workspace that updates in real-time.

## Core Design

### 1. WebSocket Infrastructure

We utilize the two existing WebSocket endpoints in the backend:

- `GET /ws/events`: Broadcasts `DevelopmentEventRead` whenever a new event is ingested.
- `GET /ws/sessions`: Broadcasts Session lifecycle transitions (e.g. `session.started`, `session.updated`).

### 2. Invalidation Strategy (`useLiveObservability.ts`)

Instead of rewriting all local states to listen for granular events (which fragments logic and causes redundant state-sync code), we utilize **TanStack Query (React Query) cache invalidation**.

By mounting `useLiveObservability` at the root (`AppLayout`), the application listens to both WebSocket feeds globally. Upon receiving an event, we intelligently invalidate the specific query keys that are affected:

- `["sessions"]`, `["projects"]`, `["project_intelligence"]`, etc.
- `["sessions", sessionId, "timeline"]`, `["session_architecture", sessionId]`.

Because the analysis pipeline (`StaticAnalysis`, `SecurityGuardian`, `CodeEvolution`) runs in a background task that takes a few milliseconds, we apply a strategic **500ms debounce/delay** before invalidating the analysis-dependent queries (such as Architecture Timeline and Replay). This guarantees the subsequent GET request fetches the fully processed truth.

### 3. State Management & Over-Rendering

By utilizing standard cache invalidation, React Query batches the re-renders. Components automatically swap to the new state without the user needing to refresh the browser.

### 4. Replay Immutable Growth

The Replay engine (`useReplayController.ts`) was updated. When it detects that its `frames` array has grown (i.e. the session was extended by a new event), it preserves the current playback index instead of resetting to `0`. If the user has finished watching the replay and a new event arrives, the replay seamlessly extends, allowing them to continue watching the latest keystrokes.

## Truth Boundary

This implementation enforces the Truth Boundary by explicitly NOT faking animations. The Project Pulse and other UI elements only animate when genuine, observed telemetry passes through the WebSocket and triggers a legitimate cache invalidation and UI re-render.
