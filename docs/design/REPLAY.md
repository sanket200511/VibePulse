# VibePulse Replay Experience

This document defines the complete Replay experience for VibePulse. It serves as the experiential and structural design specification for VibePulse's session playback engine, ensuring that replay acts as a reflective, clean reconstruction of software evolution rather than an ornamental animation.

This document focuses on presentation logic, pacing mechanics, and visual attention rules. It contains no React component scripts, CSS styling variables, Tailwind configurations, or media player implementation code.

---

## 1. Replay Philosophy

VibePulse Replay reconstructs a software engineering session from observable filesystem and command line events.

It is not a video screen recording, an IDE keylogger, a terminal keystroke recording, or a movie. Video screen recordings fail because they consume gigabytes of storage, capture sensitive background windows, and force developers to watch hours of static screens. IDE recordings capture trivial keystrokes rather than macro progress.

Instead, Replay acts as an event-driven session playback engine. It reads the deterministic SQLite event log and reconstructs the session step-by-step, allowing developers to revisit exactly how their code and architecture evolved over time in a secure, light-weight, and searchable format.

---

## 2. Replay Personality

The Replay engine behaves like an experienced, thoughtful mentor reviewing yesterday's code.

It is calm, deliberate, and encouraging. It is not a flashy presentation deck, a game replay, or a YouTube video editor. It does not use sound effects, hyper-active transitions, or artificial speed indicators. Its sole purpose is to encourage reflection, contemplation, and self-awareness. It moves quietly, letting the code's changes speak for themselves.

---

## 3. Replay Narrative

Replay tells the story of a coding session unfolding in sequence, allowing developers to review their workspace journey chapter-by-chapter:

```
Observation Begins ➔ Exploration ➔ Implementation ➔ Experimentation ➔ Refactoring ➔ Checkpoint ➔ Completion
```

- **Observation Begins**: The workspace opens; observation gate transitions to active.
- **Exploration**: The developer reviews code directories and reads configuration files.
- **Implementation**: The initial code blocks are written and structural models are established.
- **Experimentation**: The developer tries alternative approaches, runs validation scripts, or tests endpoints.
- **Refactoring**: Code blocks are optimized, unused variables are removed, and files are consolidated.
- **Checkpoint**: A Git commit is made, anchoring the milestone.
- **Completion**: The session concludes, saving a finalized snapshot of today's progress.

---

## 4. Replay Pace

Replay does not run at real-time speed. An engineering session contains hours of typing, compiling, and stepping away. Playing this back literally would be tedious and useless.

- **Pacing Principle**: Pacing optimizes understanding rather than literal timing accuracy.
- **Dynamic Acceleration**: Periods of steady, repetitive writing are accelerated. Major transitions or checkpoint events are played back slowly to highlight their architectural importance.
- **Idle Skipping**: Gaps of inactivity (e.g., when the developer leaves the desk or reads documentation) are bypassed or collapsed into brief, elegant transition pauses.

---

## 5. Time Compression

To keep playbacks within a digestible length, Replay compresses time based on event value:

- **Action Aggregation**: Multiple consecutive file modifications are grouped into a single visual update. Instead of rendering every individual character addition, the playback updates the file structure in complete semantic steps.
- **Gap Collapsing**: Long idle pauses are compressed. A 30-minute break is represented by a brief vertical indicator and an inline tag: _"Away from keyboard (30m)"_, keeping the flow moving.
- **Refactoring Summaries**: Deleting a block of code and replacing it is rendered as a clean, unified transition rather than a sequence of micro-backspaces.

---

## 6. Replay Controls

The user manages the playback through a set of simple, intuitive controls designed for reflection:

- **Play / Pause / Resume**: Starts, stops, or resumes the playback stream.
- **Step Forward / Step Back**: Moves the replay forward or backward by a single event block, allowing frame-by-frame verification.
- **Jump to Chapter / Bookmark**: Jumps immediately to significant session milestones (e.g., a Git commit or a file creation).
- **Replay Speed**: Adjusts playback acceleration rates to suit the presenter's or developer's reading speed.

---

## 7. Replay Timeline Relationship

The Timeline and Replay experiences are two sides of the same coin:

- **Timeline Explains**: The timeline is the static, retrospective index. It provides an immediate, high-level structural map of the day.
- **Replay Relives**: The Replay engine is the dynamic player. It allows the developer to scrub back and watch the chronology rebuild, transforming static summaries into a living workflow.

---

## 8. Replay Camera

The Replay interface manages the user's attention by utilizing a conceptual "camera focus" rule:

- **Focus Transitions**: As different parts of the workspace change (e.g., a new file is created, or a validation script runs in the terminal), the visual focus shifts smoothly to highlight that specific node.
- **No Visual Whiplash**: Focus moves deliberately. The camera does not jump erratically between distant lines of code. If multiple events occur simultaneously, the UI groups them into a single, high-level structural highlight.

---

## 9. Replay States

The interface communicates state changes cleanly, evoking corresponding emotional responses:

- **Not Started**: The resting state before playback begins. (Evokes _Curiosity_).
- **Loading**: Pre-caching session events from the database. (Evokes _Anticipation_).
- **Playing**: The timeline is actively building. (Evokes _Recognition_ and _Understanding_).
- **Paused**: Playback is suspended at a specific event. (Evokes _Reflection_).
- **Completed**: The playback has reached the end of the session. (Evokes _Pride_ and _Motivation_).

---

## 10. Replay Memory

The Replay view preserves complete structural context throughout the playback. The user is never left disoriented:

- **Current Location**: The active chapter name is permanently visible.
- **Recent History**: A scrollable timeline trail displays the three most recent milestones.
- **Upcoming Events**: A preview indicator previews what checkpoint or file operation is coming next.

---

## 11. AI Relationship

AI summarizes and clarifies the playback, but never replaces the recorded telemetry.

- **AI Insight**: The AI analyzes the play rate and event density to explain transitions (e.g., _"Here, the developer paused for 10 minutes, likely researching Alembic constraints, before writing the database migration file"_).
- **Telemetry Sovereignty**: The replay itself is built exclusively from factual SQLite observations. AI notes are styled as supplementary annotations.

---

## 12. Trust

The Replay engine is a truthful reconstruction, not a simulation.

- **Recorded Origin**: Every file change, command, and timestamp rendered in the replay corresponds to a physical event recorded by the daemon. The UI never fabricates keystrokes, mocks terminal output, or guesses at folder hierarchies.
- **Transparency First**: If a sequence appears unusual, the developer can inspect the raw event logs directly, ensuring complete data honesty.

---

## 13. Empty States

If a project has no recorded telemetry, the Replay view remains a beautiful visual anchor:

- **Curiosity Trigger**: The empty screen displays a visual mockup of a playback timeline, illustrating how a feature's development arc unfolds.
- **Ready indicator**: Shows a clear, friendly call-to-action to begin observation.

---

## 14. Demo Mode

During presentations, Replay serves as a showcase for VibePulse's engineering depth.

- **Curated Rhythms**: In Demo Mode, the playback runs a pre-loaded, highly authentic session (e.g., creating a module, writing tests, debugging, refactoring, and committing). Pacing is optimized to complete the showcase within a 45-second replay window, demonstrating the dynamic compression and timeline relationship cleanly.

---

## 15. Emotional Journey

Reviewing a session replay guides the developer through a constructive emotional arc:

```
Curiosity (Let's see how I built this)
     ↓
Recognition (Ah, yes, that was when I ran into the schema error)
     ↓
Understanding (I see why I spent 15 minutes debugging)
     ↓
Reflection (That refactor cleaned up the logic nicely)
     ↓
Pride (I solved that problem systematically)
     ↓
Motivation (I'm ready to write the next module)
```

---

## 16. Anti-Patterns

The following design behaviors are prohibited in the Replay view:

- **Movie Effects**: Adding film grain, CRT scan lines, or vignette borders.
- **Flashy Transitions**: Using camera shakes, page curls, or slide-in animations.
- **Unnecessary Particles**: Rendering glowing dots or floating pixels around active changes.
- **Fake Typing / Cursor Movement**: Simulating character-by-character typing or drawing fake cursor coordinates.
- **Exaggerated Animations**: Speed indicators, progress dials, or spinning widgets.
- **Meaningless Playback**: Replaying every minor cursor shift or hover event without semantic value.

---

## 17. Success Criteria

Replay succeeds when:

1.  **Work Evolution is Clear**: A developer can watch a 60-second replay and immediately remember how their code structure evolved.
2.  **Decisions are Understandable**: The pacing reveals _why_ changes occurred, highlighting focus shifts and contemplation pauses.
3.  **Trust is Absolute**: The playback looks and feels honest, matching the developer's actual memory of their coding session.
4.  **Reflection is Encouraged**: The developer feels calmer and more aware of their own habits after watching the replay.
