# Project Pulse

## Purpose

The Project Pulse is VibePulse's signature longitudinal visualization for project intelligence. It serves as a visual fingerprint, tracking the rhythm and scale of development sessions over time. It provides a temporal map of when work happened and how intensive it was.

## Deterministic Semantics

The visualization strictly encodes deterministic telemetry:

- **X-axis (Horizontal Space)**: Proportional mapping of absolute time between the first and latest observed session. Empty horizontal space correctly visualizes periods of inactivity.
- **Node Position (Y-axis Baseline)**: All sessions anchor to a shared temporal baseline (`border-bottom`).
- **Pulse Height**: Scaled based on the deterministic `event_count` of the session, bounded to a maximum visual height to preserve layout stability while remaining proportional.
- **Node Cap (Dot)**: Represents the existence of a session. Colored dots distinguish ACTIVE from COMPLETED sessions.

## Normalization Algorithm

Raw event counts can vary by orders of magnitude. The visual normalization algorithm:

1. Identifies `maxEvents = Math.max(...session.event_count, 1)`.
2. Computes proportional height: `heightPct = Math.max(10, Math.min(95, (session.event_count / maxEvents) * 95))`.
3. Limits minimum height to `10%` to ensure even low-event sessions are visible. Limits maximum height to `95%` to prevent tooltip clipping.

## Temporal Distribution

Sessions are positioned using absolute spacing along the X-axis:
`leftPct = ((session.started_at - minTime) / timeSpan) * 100`
This preserves chronological accuracy. If 10 sessions occur in week 1 and 1 session occurs in week 4, the graph will correctly show a cluster followed by a large gap.

## Small and Large Dataset Behavior

- **0 Sessions**: Renders an explicit empty state ("No observed sessions yet.") rather than a broken graph.
- **1-5 Sessions**: Proportional width and positioning prevent massive flex-stretching (a previous weakness). Nodes maintain a standard `12px` interaction box and `2px` visual stem.
- **20-100 Sessions**: Nodes gracefully cluster and overlap horizontally due to absolute positioning, naturally forming "activity density" waves.

## Interaction Model

- **Hover/Focus**: Expanding the node triggers a tooltip revealing exact temporal and volumetric metrics.
- **Click**: Each pulse is an interactive `<Link>` routing the user directly to the `/sessions/:sessionId` deep dive.
- **Accessibility**: Nodes include comprehensive `aria-label`s mapping exactly to the visual data (e.g., "Session observed Jul 14, 2026 — 42 observed events").

## Truth Boundary

Project Pulse rejects speculative metrics. Height strictly means "VibePulse observed this many events". It does not claim productivity, quality, or success.

## Reduced Motion

Active sessions feature an `animate-pulse` dot. To respect user preferences, `motion-safe:animate-pulse` is applied, removing continuous animation if the OS requests reduced motion. Transitions for hover interactions remain short (200-300ms) and purposeful.
