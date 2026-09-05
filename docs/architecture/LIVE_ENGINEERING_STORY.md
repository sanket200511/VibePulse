# Live Engineering Story

## Context

In Sprint PX-10.1, DepRadar transitioned from an auto-refreshing dashboard into a fully "live" engineering experience. Previously, raw events triggered global React Query invalidations, forcing complete timeline rebuilds. Now, DepRadar intelligently splices new telemetry directly into existing views.

## Event Flow

1. The daemon observes a file modification.
2. The REST API stores the raw `DevelopmentEvent`.
3. The API triggers `run_analysis_pipeline_background`.
4. Once analysis completes, `dispatch()` builds partial `ArchitectureTimelineEntryRead` nodes strictly for the new event.
5. `dispatch()` broadcasts an `ANALYSIS_COMPLETE` payload over the `/ws/events` WebSocket.

## Update Flow (Frontend)

1. `useLiveObservability` receives the `ANALYSIS_COMPLETE` payload.
2. It loops through all `entries` and fires an elegant, global Toast ("New Observation") using the `ToastProvider`.
3. It intelligently appends the new `entries` directly to the active session's cached `["session_architecture", sessionId]` query data using `queryClient.setQueryData`.
4. It subtly invalidates related dependencies (like Project Pulse and Workspace data) without causing full-page flashes.

## Animation Rules

- **Toasts**: Slide in from the bottom right smoothly and auto-dismiss after 5 seconds. Colored according to severity (Red for Security, Accent for Architecture).
- **Workspace Pulse**: When `project.updated_at` increments, the `ProjectCard` component locally plays a 1-second pulse animation (`ring-2`, `scale-[1.02]`, `shadow`) to visually indicate activity.
- **Timeline**: New entries are appended at the bottom, naturally entering the flow.

## Truth Boundary

As always, the system enforces strict deterministic reporting. The wording in the Toasts (e.g., "Function Added") is derived identically to the timeline entries, sourced purely from `StaticAnalysisAnalyzer` and `SecurityAnalyzer`. The system invents no "insights", ensuring complete adherence to DepRadar principles.
