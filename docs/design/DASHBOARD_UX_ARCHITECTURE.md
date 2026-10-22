# VibePulse Dashboard UX Architecture

This document defines the structural architecture, layout goals, progressive disclosure tiers, and interaction states of the VibePulse Dashboard before implementation. It explains what information belongs on the dashboard and why, ensuring the interface remains a calm, functional Mission Control for the developer's workday.

This document focus entirely on UX architecture, information design, and user experience flow. It contains no React code, CSS definitions, Tailwind utility structures, backend routing logic, or framework imports.

---

## 1. Dashboard Goals

The Dashboard is designed to serve as the developer's primary workspace starting point. It answers five fundamental questions within the first 10 seconds of use:

1.  **What happened today?** (Answered by today’s plain-language narrative summary, defining the theme of the work session).
2.  **What am I doing right now?** (Answered by active workspace, active file watcher, and current session duration trackers).
3.  **What changed in the code?** (Answered by timeline previews of file creations, modifications, and git checkpoints).
4.  **What deserves my attention?** (Answered by AI-compiled insights regarding focus drifts, deep work blocks, and system milestones).
5.  **Where should I continue?** (Answered by active workspace quick links, timeline exploration routes, and replay triggers).

---

## 2. Information Hierarchy

The visual hierarchy is structured to guide the user's focus from high-level understanding down to technical details:

1.  **Greeting**: Anchors the page and establishes workspace context.
2.  **Today's Story**: The narrative summary. Placed highest because it is the most valuable conceptual summary of the day.
3.  **Observation Status**: Toggles and active gates showing whether recording is active.
4.  **Current Session**: Displays duration, active language, and workspace.
5.  **Focus Summary**: High-level representations of flow states, contemplation blocks, and breaks.
6.  **Timeline Preview**: A vertical checklist of recent checkpoints.
7.  **Projects**: A list of observed directories.
8.  **AI Reflection**: Automated pattern summaries.
9.  **Quick Actions**: Secondary triggers for routing and configuration.

### Why this order exists:

Developers scan interfaces from general-to-specific. Placing the narrative summary and observation gates at the top ensures they immediately establish _state awareness_ (e.g., _"Is VibePulse recording?"_ and _"What have I done?"_). Supporting details (timeline events and project configurations) sit lower on the page, as they are consulted only after the developer decides to dive deeper.

---

## 3. Dashboard Zones

The dashboard layout is divided into six conceptual zones, each with strict entry and exit criteria:

### Zone A: The Header (Context & Status)

- **Purpose**: Welcomes the developer and identifies active observation telemetry.
- **Primary Information**: Active workspace name, observation status (Active/Paused), and connection status.
- **Secondary Information**: Active git branch name and relative uptime indicators.
- **When it Appears**: Always visible.
- **When it Stays Hidden**: Never.
- **Actions**: Toggle observation (Start/Stop), access global settings.

### Zone B: The Narrative (Today's Story)

- **Purpose**: Summarizes today's engineering efforts in conversational prose.
- **Primary Information**: The compiled AI narrative (e.g., _"Implementing Alembic migrations and refactoring watchers for 45 minutes"_).
- **Secondary Information**: Total active duration, session start time, and primary language focus.
- **When it Appears**: As soon as the first telemetry event is recorded.
- **When it Stays Hidden**: In empty states before any filesystem events are captured.
- **Actions**: Expand summary, add manual reflection note.

### Zone C: The Focus Deck (Rhythms & States)

- **Purpose**: Visualizes the developer's work rhythms without judgment.
- **Primary Information**: Focus distribution blocks (Flow, Contemplation, Recharging).
- **Secondary Information**: Continuous work durations, average session intervals.
- **When it Appears**: After at least 10 minutes of active session observation.
- **When it Stays Hidden**: In empty states, or during short sessions under 10 minutes.
- **Actions**: Open full focus analysis page.

### Zone D: The Timeline Stream (Chronology Preview)

- **Purpose**: Previews the most recent timeline events.
- **Primary Information**: Factual event cards (Creation, Checkpoints, Evolution).
- **Secondary Information**: Relative timestamps and compressed event counts.
- **When it Appears**: As soon as one event exists.
- **When it Stays Hidden**: In empty states.
- **Actions**: Scroll list, jump to detailed timeline page, trigger playback.

### Zone E: The Project Index (Workspaces)

- **Purpose**: Lists observed directories and local folders.
- **Primary Information**: Project directory name, absolute file paths, and local file watch counts.
- **Secondary Information**: Last observed activity timestamp.
- **When it Appears**: Always.
- **When it Stays Hidden**: Never.
- **Actions**: Register new project, remove project, toggle individual workspace observation.

### Zone F: The Retrospective (Insights)

- **Purpose**: Highlights automated patterns and learnings.
- **Primary Information**: AI-generated pattern cards (Observations, Milestones, suggested improvements).
- **Secondary Information**: Traced timeline links supporting the insight.
- **When it Appears**: After 30 minutes of session observations or across multiple historical sessions.
- **When it Stays Hidden**: During early sessions where data density is insufficient to verify patterns.
- **Actions**: Dismiss insight, bookmark pattern, expand evidence.

---

## 4. Attention Flow

The eye travels along a predictable path, ensuring the developer remains calm and oriented:

```
Greeting & Active Project (Orientation)
     ↓
Today's Story (Immediate Comprehension)
     ↓
Observation Status (Verification of state)
     ↓
Current Session & Focus (Evidence)
     ↓
Timeline Preview (Technical depth)
     ↓
AI Reflection (Long-term value)
     ↓
Quick Actions (Next step routing)
```

By organizing information vertically along this path, the user is never forced to scan diagonally across the layout, reducing eye strain and cognitive fatigue.

---

## 5. Progressive Disclosure

The dashboard displays information in three distinct layers of depth to prevent visual overload:

- **Layer 1: Glance (1–5 seconds)**: Displays active workspace name, active recording status, and today's narrative headline. Minimal detail is presented.
- **Layer 2: Scan (10–30 seconds)**: Displays session duration cards, focus breakdown bars, and recent timeline milestone cards. The developer scans to verify their work rhythm.
- **Layer 3: Investigate (30+ seconds)**: Clicking any element opens secondary details (such as full file paths, git commit diff hashes, or the detailed timeline view).

---

## 6. Dashboard States

The dashboard's priorities adapt based on the state of the workspace and daemon connection:

- **No Projects State**: Priority shifts to onboarding. The dashboard hides all narrative, focus, and timeline zones, replacing them with a single, centered container explaining observation setup and a primary button to select a local directory.
- **Idle State**: The daemon is connected, but no files are being modified. The dashboard displays the most recent session's frozen narrative and history preview, sitting quietly at rest.
- **Observing State**: Telemetry is actively streaming. The dashboard highlights the active observation gate and updates session durations in soft, low-contrast pulses.
- **Building State**: High-density filesystem events are arriving. The dashboard timeline updates, and the narrative summary dynamically refines to reflect active modifications.
- **Reflection State**: The user has stopped work to review. AI Insights expand, and the timeline preview highlights manual notes and review milestones.
- **Offline State**: The daemon is disconnected. The dashboard displays a clean "Offline Preview Mode" header, showing cached SQLite data while attempting to reconnect in the background.
- **Demo State**: Displays pre-loaded developer narratives, timelines, and focus logs, maintaining interactive observation gates so presenters can toggle live states.

---

## 7. Refresh Philosophy

A living dashboard must feel alive without becoming a source of distraction:

- **No Flickering Layouts**: Height, width, and alignment of cards remain fixed. New timeline items slide in using soft transitions that do not push adjacent components erratically.
- **Batched Narrative Updates**: Today's AI narrative does not update character-by-character as files are modified. Instead, updates are compiled and refreshed in blocks (e.g., every 5 minutes or upon session state transitions), ensuring the text remains static and readable while the developer is scanning.
- **Low-Contrast Pulsing**: Active duration timers update using subtle changes in opacity rather than blinking high-contrast colors.

---

## 8. Empty Space

Whitespace is treated as a core structural element:

- **Gaps as Separators**: Layout zones are separated by spacious margins, eliminating the need for heavy visual borders or dividing lines.
- **Text Breathing Space**: Paragraphs and monospace listings maintain line-height values that allow characters to read comfortably on screen.
- **Visual Sanctuary**: Large monitors preserve generous page margins on the left and right, ensuring the dashboard remains centered and comfortable to read.

---

## 9. Dashboard Relationships

The dashboard serves as the central hub, routing developers to dedicated sub-pages without duplicating their contents:

- **Timeline**: The dashboard timeline preview displays the five most recent checkpoints. Clicking the header routes the user to the full `docs/design/TIMELINE.md` log.
- **Replay**: A quick-trigger button on the dashboard session card routes the user directly to the `docs/design/REPLAY.md` playback view.
- **Projects**: Workspace management on the dashboard lets users toggle observation states or add paths. Deep settings (e.g., ignore filters) are deferred to global configurations.
- **AI**: Today's narrative story on the dashboard is powered by the AI analysis specified in `docs/design/AI_INSIGHTS.md`.

---

## 10. Anti-Patterns

The Dashboard UX prohibits the following designs:

- **The Analytics Trap**: Displaying multiple pie charts, scatter plots, and graphs showing compile trends.
- **The Admin Panel**: Displaying complex database health monitors, system memory dials, or user profile administration tables.
- **The DevOps Wall**: Displaying scrolling rows of raw JSON telemetry and build outputs.
- **The Gamified Scoreboard**: Adding badges, daily targets (e.g., _"Write 500 lines of code"_), or productivity grading tags.

---

## 11. Success Criteria

The Dashboard UX succeeds when:

1.  **Glance Awareness is Met**: A developer understands today's progress and active status within 10 seconds of opening the tool.
2.  **Visual Noise is Suppressed**: The user feels a sense of calm and organization when looking at the workspace.
3.  **Frictionless Exploration**: Navigating to details (timeline, replay) feels intuitive and requires no manual training.
