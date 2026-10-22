# VibePulse Dashboard Experience

This document defines the complete Dashboard experience for VibePulse. It serves as the experiential and structural design specification for the primary interface, ensuring the dashboard acts as the developer's calm, focused Mission Control for their workday.

This document focuses on layout philosophy, information hierarchy, and visual behavior. It contains no React component declarations, CSS styling rules, Tailwind utility classes, or platform-specific variables.

---

## 1. Purpose

The VibePulse Dashboard exists to answer a single question for the developer:

> **"How is my engineering journey going today?"**

It is not an analytics panel, a corporate KPI tracker, or a monitoring dashboard. It does not exist to evaluate performance or enforce competitive productivity metrics. Instead, the dashboard provides a quiet, high-level overview of active workspaces and current session progress, translating raw filesystem telemetry into a clear, understandable story of focus, creation, and momentum.

---

## 2. Dashboard Personality

The dashboard behaves like a trusted, experienced engineering teammate, a calm team lead, or a project companion. It quietly helps developers understand their own processes by providing clean, objective context.

It never acts like a productivity coach, a performance monitor, a corporate scorecard, or a gamified scoreboard. The dashboard has no interest in forcing quotas or grading effort. It never judges, never pressures, and never scolds. It observes, compiles, and presents facts, allowing the developer to draw their own conclusions in peace.

---

## 3. Living Dashboard

The dashboard is not a static webpage; it is a living workspace that grows and evolves alongside the developer throughout the workday:

```
Observation starts
     ↓
Today's Story evolves
     ↓
Timeline grows
     ↓
Focus changes
     ↓
Insights become richer
     ↓
Story becomes complete
```

As telemetry is collected, the narrative summary adjusts, the timeline expands, and active insights become richer. However, this growth is natural and subtle. The interface avoids constant movement, flickering counters, or real-time ticker-tape transitions. Layout changes occur only when new, meaningful phases of work are established, maintaining a calm background presence.

---

## 4. Dashboard Silence

Stillness communicates stability. When nothing meaningful is changing—such as when the developer is in deep flow, researching in a browser, or stepping away from the desk—the dashboard goes silent.

- **No Unnecessary Motion**: The dashboard does not animate, flash, pulse, or cycle colors simply to prove it is alive.
- **Waiting Calmliness**: Silence is treated as an active, intentional design element. The dashboard sits quietly at rest, waiting for the next natural event transition without demanding attention or creating visual distraction.

---

## 5. Trust and Transparency

Developers trust tools that are honest and transparent. To establish this trust, the dashboard adheres to strict engineering rules:

- **Observable Origins**: Every insight and summary statement must originate directly from observable filesystem events. The system never invents, guesses, or hypothesizes about developer actions.
- **Traceable Metrics**: Every metric, duration, or event marker must have a traceable, explainable origin in the raw timeline logs. If a summary says _"40 minutes of refactoring,"_ the user must be able to verify those exact edits in the timeline.
- **No Visual Effects**: Confidence is earned through structural transparency and accurate data, never through visual flair or superficial animations.

---

## 6. Memory and Continuity

The dashboard understands that work does not happen in isolated 24-hour boxes. It remembers and preserves continuity across multiple timeframes:

```
Yesterday ➔ Today ➔ This Week ➔ Project History
```

The system tracks historical patterns to provide context for today's session. However, this memory must not overwhelm the current day's focus. Historical summaries and weekly patterns sit in secondary layers, supporting today's work as a subtle reference rather than competing with it for layout dominance.

---

## 7. First Impression

During the first five seconds of opening VibePulse, the user must experience a feeling of visual relief and organization.

- **What Attracts Attention**: The primary focal point must be today’s high-level narrative summary—a clear, plain-language description of today’s focus.
- **What Remains Quiet**: Metrics, directories, timeline details, and secondary navigation elements must remain understated. They exist to support the primary narrative, not compete with it.
- **Zero Competition**: No blinking warnings, flashing activity graphs, or high-saturation colors are allowed. The interface sits at rest, inviting inspection rather than screaming for attention.

---

## 8. Information Hierarchy

The layout is structured to guide the user's eye from the summary to the supporting evidence:

1.  **Greeting**: A brief, personalized, and calm entry line.
2.  **Today's Story**: The central narrative summary describing the day's development theme.
3.  **Current Session**: The active focus state, active workspace, and duration.
4.  **Focus**: Visual representations of focus rhythm, flow states, and pauses.
5.  **Timeline Preview**: A compact, chronological glimpse of the most recent event checkpoints.
6.  **Projects**: A list of currently observed workspaces and their active gates.
7.  **Insights**: High-level automated observations detailing session progression.
8.  **Secondary Information**: Metadata, system status indicators, and background settings.

This progression ensures the developer understands the big picture before deciding whether to inspect low-level logs.

---

## 9. Dashboard Narrative

The dashboard is structured like a story, answering five fundamental questions as the developer scans from top to bottom:

- _Where am I?_ (Answered by active project indicators and workspace names).
- _What happened today?_ (Answered by the plain-language narrative summary).
- _What am I doing now?_ (Answered by active session trackers and focus indicators).
- _What deserves attention?_ (Answered by timeline checkpoints and insights).
- _Where should I go next?_ (Answered by quick actions and navigation routes).

---

## 10. Core Regions

The dashboard layout is divided into distinct, single-purpose visual regions:

- **Welcome**: Greets the developer and anchors the page.
- **Today's Story**: Houses the high-level narrative. Acts as the primary page focal point.
- **Observation Status**: Indicates whether the observation gate is open (recording telemetry) or closed (paused).
- **Current Session**: Displays duration, active language, and session state.
- **Developer Focus**: Visualizes flow states, contemplation pauses, and break intervals.
- **Recent Timeline**: Shows the most recent timeline checkpoints (Creation, Checkpoints, etc.).
- **Projects**: Lists observed project directories with inline observation gates.
- **Insights**: Displays key retrospective summaries generated from session history.
- **Quick Actions**: Standard navigation triggers (e.g., jump to full timeline, review history).

---

## 11. Dashboard Rhythm

The eye travels naturally through the layout along a central vertical axis, eliminating visual chaos:

```
Top (Greeting & Narrative - The Headline)
     ↓
Center (Focus & Active Session - The Evidence)
     ↓
Supporting Information (Timeline preview & Projects - The Context)
     ↓
Navigation (Quick Actions - The Next Step)
```

By aligning primary components to the center and left, and tucking secondary metrics into structured columns, the layout prevents diagonal scanning confusion.

---

## 12. Information Density

The dashboard enforces a comfortable, low-density reading rhythm.

- **What Belongs**: Core narratives, primary session durations, focus state tracking, active project lists, and high-level milestones.
- **What Does NOT Belong**: Dense event logs, full file path trees, raw character diff numbers, system telemetry variables, or multiple charts showing overlapping intervals. Detail belongs strictly on the detailed timeline view.

---

## 13. Cards Philosophy

Layout blocks are organized as single-purpose information modules:

- **Single-Question Focus**: Each card must answer exactly one question (e.g., _"What is my active workspace?"_ or _"What is my focus rhythm?"_).
- **No Combined Data**: A card showing active session duration must never be combined with a detailed list of modified files or language charts.
- **Sizing & Structure**: Cards use identical padding, corner styling, and depth elevation to create a unified structural rhythm.

---

## 14. Metrics Philosophy

VibePulse rejects vanity metrics that create stress or false targets.

- **Value-Driven Metrics**: Metrics exist only if they directly help the developer understand their work rhythm (e.g., duration of flow state, distribution of language focus, or length of active sessions).
- **No Gamification**: Avoid metrics like "total lines of code added," "edits per minute," or "productivity grades." Big, high-contrast numbers are banned unless they represent a clean duration counter.

---

## 15. Empty States

The dashboard experience for new users must feel welcoming, encouraging, and clean:

- **No Broken Layouts**: If no session data exists, the dashboard must not show empty cards, error codes, or broken outlines.
- **Visual Sanctuary**: The screen displays a beautifully aligned empty state container featuring an encouraging welcome message, a clear explanation of how VibePulse observes, and a single, primary action button to register the first workspace.

---

## 16. Demo Mode Behaviour

In Demo Mode, the dashboard transitions from displaying active local SQLite telemetry to showcasing a curated, high-fidelity development session.

- **Curated Narratives**: The narrative summary displays today's pre-loaded story, and the focus modules show a rich, realistic rhythm of creation and refactoring.
- **Live Indicators**: The start/stop observation gate remains interactive, letting presenters toggle observation states on-the-fly to demonstrate the immediate UI feedback.
- **State Delineation**: A subtle, professional indicator informs the user that they are in Demo Mode, ensuring they are never confused about the source of the data.
- **Believable Authenticity**: Demo Mode must never exaggerate reality. Curated sessions must remain entirely believable, reflecting natural human speeds, coding rhythms, and pauses. Authenticity is always more valuable than visual spectacle. The audience should leave the showcase believing, _"I could actually use this in my daily workflow,"_ rather than, _"This only looks good during a canned demo."_

---

## 17. Attention Model

The attention budget is strictly protected:

- **One Hero**: Today’s Narrative Summary occupies the highest visual tier.
- **Silent Supporting Cast**: All other modules (duration, projects, timeline preview) are visually styled to sit on secondary layers, letting the narrative command initial focus.

---

## 18. Interaction Philosophy

Interaction is designed to be frictionless and inviting:

- **Progressive Navigation**: Clicking any card or preview item routes the user logically to its detailed sub-view (e.g., clicking the timeline preview opens the full timeline).
- **Interactive Hover States**: Elements change depth or scale slightly on hover to signal interactivity, without producing jarring layout shifts.

---

## 19. Success Criteria

The Dashboard succeeds when:

1.  **Glance Time is Under 10 Seconds**: A developer glances at the dashboard and instantly knows today's narrative, focus rhythm, and active workspace status.
2.  **Visual Calm is Achieved**: The interface feels like a quiet sanctuary, reducing the developer's cognitive fatigue before they start their coding session.
3.  **Hierarchy is Predictable**: The user's eye naturally transitions down the page from the summary to details without visual confusion.
4.  **Trust is Maintained**: The developer immediately understands the source and evidence behind every metric and insight.
5.  **Calmness is Achieved**: Developers feel a sense of organization and visual relief upon opening the tool.
6.  **Continuous Value**: The dashboard becomes progressively more useful the longer it is observed, rewarding returning users without demanding active focus.

---

## 20. Emotional Journey

Opening VibePulse must feel like entering a quietly organized workspace:

> _"Someone quietly organized my workday."_

The experience is structured as an emotional progression:

```
Curiosity (What did I achieve?)
     ↓
Understanding (Ah, I refactored the database logic for 45 minutes)
     ↓
Confidence (My focus rhythm was solid; my progress is secure)
     ↓
Focus (I see what needs attention next)
     ↓
Action (Click start / resume coding)
```
