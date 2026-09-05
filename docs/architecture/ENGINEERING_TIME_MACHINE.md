# Engineering Time Machine

## Context

In Sprint PX-11.0, DepRadar introduces the Engineering Time Machine. Previously, all views rendered the full present state of the project. The Time Machine allows developers to reconstruct the historical evolution of the codebase deterministically.

## The Time Machine Engine

To ensure single-source-of-truth reconstruction, DepRadar uses a centralized **Time Machine Engine** (implemented via React Context).

Instead of each UI component (e.g., Project Pulse, Timeline) implementing its own `useMemo` time-filtering logic, they receive already-sliced data from the Engine.

```
Raw Timeline
        │
        ▼
Time Machine Engine
        │
        ├────────────► Visible Timeline
        ├────────────► Visible Sessions
        ├────────────► Visible Architecture
        ├────────────► Visible Project Pulse
        ├────────────► Visible Security Findings
        └────────────► Evolution Diff
                            │
                            ▼
                     React Components
```

## State & Context

The engine maintains the core time state:

```typescript
interface TimeMachineState {
  mode: "LIVE" | "TIME_TRAVEL";
  selectedTime: Date | null;
  selectedMilestoneId?: string;
  isPlaying: boolean;
}
```

All UI components, including the Timeline Scrubber, Replay Deep-links, and the Evolution Diff interact solely with this Context.

## Evolution Diff

The Engine directly computes an `EvolutionDiff` object by taking the set difference of raw deterministically observed timeline entries (between `selectedTime` and Now).
It exposes properties such as `addedFunctions`, `securityFindings`, etc. The UI strictly renders these counters and details without performing array filtering itself.

## Replay Synchronization

The system links milestones to session frames purely through canonical `related_event_id` fields stored in the Architecture Timeline entries. It does not manually search for timestamp approximations.

## Truth Boundary

As always, the Engine enforces the deterministic Truth Boundary. It slices real telemetry; it does not generate insights, productivity scores, or hallucinate missing history.

## Performance

The engine wraps TanStack Query caches, guaranteeing no extra network requests are made during time travel. Sliced arrays are memoized within the Provider, meaning components only re-render when the Time Machine slice materially changes.
