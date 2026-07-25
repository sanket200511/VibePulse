# VibePulse Timeline Experience

This document defines the complete Timeline experience for VibePulse. It serves as the experiential and structural design specification for VibePulse's signature view, ensuring the timeline translates raw telemetry logs into a compelling, clear narrative of software creation.

This document focuses on presentation logic, information hierarchies, and temporal storytelling behavior. It contains no React components, CSS definitions, Tailwind utility structures, database tables, or platform-specific variables.

---

## 1. Timeline Philosophy

The VibePulse Timeline is the story of software being created.

It is not an event log, a git history log, a filesystem browser, an audit database, or a debugging console. Raw event logs fail because they flood the user with thousands of repetitive, low-level facts (such as file saves or micro-edits) that provide no context. By contrast, the VibePulse Timeline filters, aggregates, and prioritizes these raw inputs, translating a chaotic stream of filesystem updates into an understandable, chronological story of developer focus, intent, and progress.

---

## 2. Storytelling Philosophy

The timeline organizes a developer's session into conceptual "chapters" rather than a list of raw files:

```
Observation Started ➔ Exploration ➔ Implementation ➔ Refactoring ➔ Checkpoint ➔ Completion
```

- **Observation Started**: The opening of the observation window; sets the context.
- **Exploration**: Initial file opening, reading, or minor modifications that indicate the developer is orienting themselves in the codebase.
- **Implementation**: Steady, high-frequency writing across logic files, denoting primary feature development.
- **Refactoring**: Cleanups, file deletions, structural re-organizations, and test runs indicating polish.
- **Checkpoint**: Commits or key milestones that anchor progress.
- **Completion**: Closure of the active workspace session.

By grouping events into chapters, the timeline presents the day as a readable story, allowing developers to immediately understand their progression.

---

## 3. Timeline Hierarchy

Information is structured in vertical tiers, allowing the developer to control how deep they want to inspect the logs:

1.  **Story Chapter**: The highest level. Summarizes the focus phase (e.g., _"Refactoring observation filters"_).
2.  **Milestone**: Key markers (e.g., Git commits, starting/stopping observation, validation runs).
3.  **Meaningful Event**: Notable file operations (e.g., creation of a new test file, deletion of a module).
4.  **Supporting Metadata**: Secondary technical details (e.g., active branch names, sequence numbers, session IDs).
5.  **Raw Details**: The direct telemetry events (e.g., character additions, compilation logs).

---

## 4. Event Compression

To prevent visual clutter, the timeline employs strict event compression. A series of repetitive filesystem signals is compressed into a single, human-readable summary.

- **Compression Rule**: Instead of listing fifteen consecutive file saves over twenty minutes as fifteen independent items, the system compresses them into a single timeline block: _"Working on Observation Engine (15 modifications across 3 files)"_.
- **Value**: Compression converts noise into signal, showing the duration and target of active focus rather than the frequency of editor auto-saves.

---

## 5. Timeline Rhythm

The timeline actively preserves and reflects the rhythm of the development session:

- **Fast Moments**: High-density work clusters (e.g., rapid modifications across multiple files) are grouped closely, indicating strong momentum.
- **Slow Moments**: Dispersed events indicate careful deliberation, reading documentation, or testing.
- **Breaks & Pauses**: Empty space represents idle gaps or away-from-keyboard intervals.
- **Rhythm Visualization**: Spacing tokens from the design system represent time intervals, letting the layout itself communicate the developer's cadence.

---

## 6. Temporal Storytelling

Time itself is a primary storyteller. The layout uses spacing to communicate cognitive context:

- **Active Work**: High-frequency event blocks sit close together, representing deep work.
- **The Contemplation Pause**: A wide vertical gap preceding a major refactoring chapter tells a story of deep thought and preparation.
- **Reflection**: Text notes or manual highlights inserted during reflection phases break the timeline to anchor personal summaries.

---

## 7. Timeline Cards

Events and milestones are presented in single-purpose timeline containers:

- **Single-Question Focus**: Each card represents a single conceptual change (e.g., _"File Creation"_ or _"System Checkpoint"_).
- **Consistent Structure**: Cards share padding, alignment, and elevation levels, stacking cleanly along the central timeline axis. Unrelated metrics are never mixed within a single card.

---

## 8. Timeline States

The timeline visualizes time differently depending on the context:

- **Today**: The active, live-updating timeline. It shows the current session and reflects active filesystem updates immediately.
- **Yesterday / Historical Sessions**: Frozen timelines that are locked for retrospective analysis. They emphasize summaries and high-level chapters over active observation gates.
- **Replay**: The active playback state, where the timeline becomes interactive, letting the developer scrub through time, highlight chapters, and play back the event sequence step-by-step.

---

## 9. Progressive Disclosure

Users drill into timeline details incrementally, preventing cognitive overload:

```
Story (Refactored database logic)
     ↓
Summary (3 files modified, 1 deleted)
     ↓
Details (Modified: db.ts, query.ts; Deleted: old_db.ts)
     ↓
Raw Events (daemon_seq: 142, server_received_at: 10:42:01)
```

The user remains in control of information depth, keeping the primary view clean.

---

## 10. Navigation

Navigating through the development history is fluid and multi-dimensional:

- **Scrubbing & Scrolling**: Continuous vertical scrolling with inline floating date headers.
- **Replay Controls**: Standard playback triggers (play, pause, step forward, step backward) to watch the timeline build in sequence.
- **Bookmarks**: Visual flags marking key checkpoints (commits or manual notes) for rapid jumping.
- **Timeline Search**: Quick filtering by file name, extension, directory, or event type.

---

## 11. Replay Relationship

The Timeline and Replay views are complementary halves of the same experience:

- **Timeline Explains**: The static timeline provides a summarized, retrospective explanation of the workday.
- **Replay Relives**: The Replay view animates the event sequence in simulated real-time, allowing developers to watch the physical evolution of their workspace, step-by-step.

---

## 12. AI Relationship

AI features enhance and support the timeline, never replacing the developer's source of truth.

- **AI Summarizes**: The AI reads the compressed event stream to write natural-language chapter summaries and suggest focus names.
- **Fact First**: The timeline's raw event sequence remains the immutable source of truth. If the developer disputes an AI summary, the raw logs are always available to inspect, ensuring complete transparency.

---

## 13. Trust

The timeline is an honest recorder.

- **Deterministic Origins**: Every story, chapter name, and metric must originate from observable database events. The timeline never invents actions or guesses at code intentions.
- **No Speculative Padding**: If the developer sat idle for two hours, the timeline shows a blank pause, never inventing synthetic activity to pad the session.

---

## 14. Empty States

Before any filesystem observation is recorded, the timeline remains a clean, encouraging workspace:

- **Instructive Layout**: Instead of showing a blank table, the empty state displays a visual map of the timeline structure, explaining how file creations and commits build the story of their code.
- **Call-to-Action**: A single button is provided to open the observation gate.

---

## 15. Demo Mode

In Demo Mode, the timeline serves as the narrative centerpiece of the presentation.

- **Curated Authenticity**: The timeline is pre-populated with a highly believable development session (e.g., building a small feature, refactoring it, testing it, and committing it). It avoids synthetic perfection, containing realistic coding pauses and refactoring cycles to prove the system's day-to-day utility.

---

## 16. Anti-Patterns

The following timeline layouts are prohibited:

- **Infinite Log Tables**: Standard spreadsheet grids filled with thousands of raw timestamps and file changes.
- **Repeated Save Logs**: Displaying a line item for every single file auto-save.
- **Rainbow Events**: Using aggressive color palettes for different event types.
- **Cluttered Metrics**: Placing charts, dial gauges, or unrelated summaries inside timeline cards.
- **Meaningless Iconography**: Placing icons next to every event without a strict semantic role.

---

## 17. Success Criteria

The Timeline succeeds when:

1.  **Understanding is Instant**: A developer can glance at their timeline for 10 seconds and recall exactly what they built and how they built it.
2.  **Rhythm is Clear**: The developer can distinguish flow states from research pauses immediately by looking at layout spacing.
3.  **Navigation feels Effortless**: Scrubbing, playing, and jumping between bookmarks feels fluid.
4.  **The Story is Trustworthy**: The developer feels the narrative accurately represents their workday.

---

## 18. Emotional Journey

Reviewing the timeline should lead the developer through a positive retrospective cycle:

```
Discovery (What did I build today?)
     ↓
Understanding (Ah, I spent 30 minutes in contemplation before refactoring)
     ↓
Reflection (That refactor was clean; my rhythm was good)
     ↓
Pride (I built this systematically and committed it cleanly)
     ↓
Curiosity (Let's replay the playback to see how the code structure evolved)
```
