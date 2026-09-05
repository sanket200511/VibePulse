# Engineering DNA

## Architecture Concept

DepRadar is an Engineering Memory Platform. Rather than fabricating summaries, we build deterministic records of how software evolved over time.

**Engineering DNA** shifts this paradigm to the file level. For any given file in a repository, the Engineering DNA provides a complete, math-backed biography of its entire observed lifecycle. Every node in the DNA Strand directly correlates to a specific engineering event captured by the underlying passive observation daemon.

## Truth Boundary

Engineering DNA strictly enforces the DepRadar Truth Boundary:

1.  **No Hallucinations**: We do not use LLMs to guess what a developer did. If a function was added, it was mathematically verified via AST diffing (`code_evolution` analyzer).
2.  **Deterministic Aggregation**: Velocity totals (e.g., functions added, TODOs resolved, security alerts triggered) are raw aggregates of time-series observations.
3.  **Traceability**: Every entry in the Biography Timeline links directly to a specific `event_id` and `session_id`, meaning the user can jump straight into the Replay Engine to watch exactly how that code was written.

## Component Design

### 1. Backend Domain (`engineering_dna`)

A pure deterministic reduction engine that consumes:

- A stream of `DevelopmentEvent` models.
- Their associated `EventAnalysis` models (containing `code_evolution` and `security_guardian` findings).

It reduces this flat stream into an `EngineeringDNA` schema containing:

- File identity (path, first observed, last observed).
- Structural totals (+N functions, -N classes, etc.).
- `BiographyEntry` list representing chronological milestones.

### 2. Time Machine Slicing

Because Engineering DNA is derived entirely from immutable telemetry, it natively supports the `TimeMachineContext`. When the user drags the timeline scrubber, the frontend simply slices the `BiographyEntry` array where `timestamp <= selectedTime` and dynamically re-reduces the structural totals, instantly showing the exact state of the file on Tuesday at 4 PM.

### 3. Live Mode

The `EngineeringDNAPage` listens to WebSocket `ANALYSIS_COMPLETE` messages. When an analysis event correlates to the currently viewed file path, the React Query cache is automatically invalidated, causing the DNA Strand to grow in real-time as the developer types.

### 4. Presentation Mode Integration

A dedicated stop is placed on the Presentation Mode Tour, highlighting the Engineering DNA interface to demonstrate to viewers the depth of DepRadar's granular file-level observability.

## Future Evolution

Engineering DNA paves the way for cross-file correlation. In future sprints, the DNA of two files could be compared to identify implicit architectural coupling (e.g., if File A's DNA constantly mutates at the exact same timestamp as File B).

## Presentation & Interaction Model

### UX Paradigm

Engineering DNA is intentionally designed to reject traditional "dashboard" aesthetics in favor of a **living organism** approach.

- **Double-Helix DNA Strand**: Nodes explicitly map chronologically down a glowing central spine, alternating left and right to construct a visual representation of the file's genetic mutation history.
- **Microinteractions**: Nodes swell and cast localized box-shadows upon hover, providing tactile feedback without resorting to complex canvas engines. Connectors gracefully shift hues on focus to emphasize lineage.
- **Memory Highlights**: Automatic curation of key file milestones ("First Function", "Largest Refactor", "First Security Finding"). These are not AI-generated; they are mathematically extracted from the deterministic timeline.

### Animation Model & Time Machine Synchronization

The `TimeMachineContext` acts as the source of truth for the entire page's temporal state.

- **Synchronized Rewind**: When dragging the scrubber backward, the `selectedTime` propagates through the tree. Biography nodes mathematically in the "future" undergo a graceful `opacity-0 max-h-0 scale-y-0` collapse. This creates a literal, buttery-smooth visual rewinding of the DNA strand.
- **Deterministic Recalculation**: The _Evolution Scorecard_ and _Current State_ components instantly re-derive totals (Functions Alive, Imports Alive) by re-aggregating the AST mutations against the sliced `biography` array. No network requests are made.

### Presentation Mode Behavior

When launched into a presentation context via `PresentationProvider`:

- The system automatically engages the `TimeMachineContext`.
- A background `requestAnimationFrame` loop mathematically scrubs the `selectedTime` from the file's birth up to the present day over 3 seconds, causing the DNA strand to dynamically reconstruct itself before the user's eyes.
- The UI retains 60 FPS by relying exclusively on CSS `transform` and `opacity` interpolations driven by Tailwind.

### Performance Considerations

- **Memoization**: All slicing, highlight extraction, and scorecard computations execute in a single unified `useMemo` boundary.
- **Single Source Data**: The backend provides one flat JSON payload via `useEngineeringDNA`. The UI performs lightweight derivations entirely in memory.
- **CSS-Driven Layouts**: The double-helix look eschews heavy SVG libraries or React-Spring wrappers. Pure CSS flexbox layout handles the alternating layout (`isLeft = index % 2 === 0`), and Tailwind's arbitrary values handle exact spatial centering.

### Accessibility

- **Semantic Structure**: Meaning is never conveyed exclusively through color. Every glowing node includes an associated icon and descriptive text.
- **Keyboard Navigation**: DNA nodes are standard focusable regions with visible focus rings (`focus-visible:ring-2`), ensuring they can be navigated sequentially.
- **Reduced Motion**: Future implementations will hook into `@media (prefers-reduced-motion)` to snap the Time Machine instead of animating the expansion.
