# VibePulse Demo Mode Specification

This document defines the complete demonstration experience of VibePulse. It serves as the experiential and narrative design specification for showcase environments, ensuring that VibePulse can be quickly understood, experienced, and evaluated within a 3–5 minute presentation window.

This document focuses on presentation storytelling, visual hierarchy progression, and data design philosophy. It contains no React components, CSS definitions, mock database schemas, or implementation-specific variables.

---

## 1. Purpose

Demo Mode exists to make VibePulse’s passive observation capability immediately understandable and compelling to an external audience.

Unlike Production Mode, which relies on active, real-time filesystem activity gathered over days, Demo Mode delivers a pre-loaded, coherent, and highly structured story of a realistic development session. It does not display artificial complexity or arbitrary mock datasets. Instead, it showcases the product's core telemetry, analysis, and visualization capabilities by projecting a realistic, relatable engineering journey that feels authentic, professional, and trustworthy.

---

## 2. Demo Narrative

The demonstration is designed as a journey of progressive discovery, leading the audience from high-level awareness to deep technical detail:

```
Welcome & Context (0:00 - 0:30)
     ↓
Project Overview (0:30 - 1:00)
     ↓
Today's Story (1:00 - 1:30)
     ↓
Focus Journey (1:30 - 2:00)
     ↓
Timeline Details (2:00 - 2:30)
     ↓
AI Reflection (2:30 - 3:00)
     ↓
Playback Replay (3:00 - 3:45)
     ↓
Closing Summary (3:45 - 4:15)
```

- **Welcome**: Establishes the "Mission Control" vision. A calm, clean, focused entry point.
- **Project Overview**: Shows multiple active projects, demonstrating that VibePulse sits quietly at the workspace root observing multiple paths.
- **Today's Story**: Replaces dry data points with a human-readable narrative summarizing today's active session.
- **Focus Journey**: Visualizes the developer's work rhythms, separating flow state, contemplation, and breaks.
- **Timeline Details**: Chronologically displays file creation, evolution, removal, and checkpoint events.
- **AI Reflection**: Demonstrates the automated synthesis of the session, highlighting focus outcomes and architectural evolution.
- **Playback Replay**: Shows the step-by-step playback of the development stream, visualizing how the code evolved over time.
- **Closing Summary**: Returns to a high-level view, leaving the audience with a sense of clarity, confidence, and system trust.

---

## 3. Opening Experience

The first screen must instantly establish the tool's character:

- **Calm & Confidence**: The opening view should be visually spacious, avoiding crowded metrics or loading spinners. It must communicate a quiet, professional environment.
- **Immediate Context**: It should show a single active project at rest, with a clear indicator of the system's active observation status. The presenter should not need to configure anything; the system should feel ready and secure.
- **Avoiding Cognitive Overload**: No dense tables or multi-colored charts on step one. The focus is strictly on the workspace identity and the status of passive recording.

---

## 4. Storytelling Principles

Every screen and view in Demo Mode must answer exactly one core question, building understanding systematically:

1.  **What happened?** (Answered by the narrative summary headline: _"Refactoring database logic in Python for 45 minutes"_).
2.  **When did it happen?** (Answered by the session timeline boundary and date indicators).
3.  **Why did it happen?** (Answered by the focus journey, showing continuous writing versus research/contemplation pauses).
4.  **What changed?** (Answered by the detailed event stream, mapping file evolution and checkpoint events).
5.  **What did we learn?** (Answered by the AI reflection and summary panels).

By ensuring each view has a single focus, the audience moves through the product with complete clarity.

---

## 5. Demo Data Philosophy

The success of the demonstration depends on the authenticity of its pre-loaded data. The dataset must tell a believable developer story:

- **Believable Sessions**: The active intervals must mirror real life. Avoid continuous 4-hour blocks of constant typing. Include natural pauses for research, coffee breaks, and contemplation.
- **Realistic File Structures**: Show paths that developers recognize (e.g., standard directories, configuration files, and core logic files), never randomized strings.
- **Natural Evolution**: The timeline should tell a story:
  - _Start_: Creation of a new module or test file.
  - _Middle_: Multiple modifications, a deletion/refactoring sequence, and subsequent test runs.
  - _End_: A structured checkpoint and a successful validation summary.
- **Authentic Imperfection**: Include minor diversions, such as brief syntax updates followed immediately by corrections, demonstrating that VibePulse accurately tracks real human processes.

---

## 6. Screen Order

The recommended path through the interface follows a logical progression of depth:

1.  **Workspace Dashboard**: Shows active projects and recording gates. (Establishes the scope).
2.  **Active Session Overview**: Shows the narrative summary and high-level focus cards. (Establishes the story).
3.  **Interactive Timeline**: Drills down into specific file edits and checkpoint markers. (Establishes the technical depth).
4.  **Playback View**: Demonstrates step-by-step playback of the timeline events. (Showcases the dynamic mechanics).
5.  **Synthesis / Reflection Panel**: Presents AI summaries and focus reviews. (Demonstrates long-term value).

---

## 7. Presenter Guidance

Presenter actions must remain deliberate, steady, and narrative-driven:

- **Narrative Focus**: The presenter should talk about _what the developer was doing_ rather than explaining the UI buttons. For example: _"Here, we see the developer started refactoring their schema; VibePulse automatically captured this transition and highlighted it in the timeline."_
- **Deliberate Navigation**: Avoid rapid page switching, erratic scrolling, or clicking multiple buttons in quick succession. Allow transitions to finish smoothly.
- **De-emphasize Implementation**: Do not explain how the backend daemon, file watchers, or SQLite database work unless directly questioned. Let the interface tell the story of the data.

---

## 8. Time Budget

The demonstration must fit within a comfortable 5-minute budget:

- **Opening & Context**: 30 seconds. (Set the stage, explain what VibePulse is observing).
- **Dashboard / Project View**: 45 seconds. (Show active workspaces, start/stop gates).
- **Session Narrative & Focus**: 60 seconds. (Walk through today's story and developer focus metrics).
- **Detailed Timeline**: 60 seconds. (Drill into specific events: creation, evolution, checkpoints).
- **Playback View**: 45 seconds. (Show the step-by-step playback of the coding stream).
- **AI Reflection & Synthesis**: 45 seconds. (Show the value of automated summaries).
- **Closing Summary**: 15 seconds. (Quick final thought).

**Total Duration**: 5 minutes (300 seconds).

---

## 9. Judge Psychology

In showcase environments, judges look for specific markers of product maturity. Demo Mode must systematically reinforce these:

- **Visual Polish**: Clean layout alignment and restrained color usage instantly communicate a high-quality product.
- **Originality**: The passive observation concept and chronological playback must stand out as unique solutions to developer self-awareness.
- **Engineering Depth**: The sequence numbers, file-watching telemetry, and precise timeline indicators prove the system is technically robust.
- **Storytelling Flow**: A smooth narrative makes the product memorable, ensuring it stands out in a sea of generic dashboards.

---

## 10. Failure Handling

A demonstration must never appear broken, even if external factors fail. Demo Mode includes built-in safeguards:

- **Disconnected Daemon Safety**: If the active daemon goes offline or is unavailable, the UI must gracefully display a clear, styled "Offline Demo Mode" message with pre-cached session data, rather than showing empty blocks or console errors.
- **No Projects Safe-State**: If no local workspaces are registered, the system displays a pre-configured sample workspace with dummy paths, allowing the presenter to walk through the system without interruption.
- **Graceful API Fallbacks**: Network timeouts or API failures are intercepted cleanly, displaying cached data with a subtle connection-retry indicator.

---

## 11. Anti-Patterns

The following patterns are prohibited in Demo Mode:

- **Empty Screens**: Showing blank states or "No data available" panels during the presentation.
- **Metrics Overload**: Flooding the screen with dozens of radial progress bars, gauge charts, and trend lines.
- **Rapid Navigation**: Flickering between views so quickly that the audience loses track of where they are.
- **Fake Complexity**: Generating thousands of mock events simply to make charts look dense.
- **Immediate Deep Dive**: Opening the playback or detailed logs before establishing the project context and today's story.

---

## 12. Success Criteria

Demo Mode is successful if:

1.  **Immediate Comprehension**: An observer with no prior knowledge understands exactly what VibePulse does within the first 60 seconds.
2.  **Authentic Feeling**: The pre-loaded session feels like a real developer's workspace, not a synthetic marketing mockup.
3.  **Narrative Dominance**: The presenter spends 80% of their time explaining the engineering story and only 20% describing where buttons are located.
4.  **Zero Glitches**: The presentation runs smoothly from start to finish without layout breaks, empty states, or visual pauses.
