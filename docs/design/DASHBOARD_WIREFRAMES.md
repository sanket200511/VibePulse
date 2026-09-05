# DepRadar Dashboard Wireframe Architecture

This document defines the layout organization, visual spacing, responsive behavior, and ASCII structural wireframes for the DepRadar Dashboard. It translates the UX architecture into physical layouts, ensuring that every visual zone has a predictable, balanced location on the screen.

This specification focus entirely on physical layout, visual hierarchy, and structural wireframes. It contains no React, CSS layouts, Tailwind styles, or viewport pixel constraints.

---

## 1. Overall Layout Philosophy

The DepRadar Dashboard is structured as an asymmetrical layout designed to protect developer attention:

- **Asymmetry for Focus**: The layout separates primary narratives from secondary support telemetry. By utilizing a wide primary column for today’s story alongside a narrow rail for secondary metrics, the developer's eye naturally defaults to the narrative.
- **Structured Breathing Room**: Grids and spacing enforce vertical rhythm. Information is presented in clear blocks that follow the natural scanning directions of software developers, ensuring visual calm under all conditions.

---

## 2. Desktop Layout

On desktop displays, the dashboard organizes information into a primary canvas (wide column) and a secondary rail (narrow column).

### Desktop Option A: Symmetrical Grid (Rejected)

```
+------------------------------------------------------------+
| Greeting & Workspace Status                                |
+-----------------------------+------------------------------+
| Today's Narrative           | Focus Distribution           |
+-----------------------------+------------------------------+
| Timeline Preview            | Active Projects List         |
+-----------------------------+------------------------------+
```

- _Trade-offs_: Equal column widths create competing visual heroes. The eye is pulled in multiple directions at once, diluting the importance of the narrative.

### Desktop Option B: Asymmetrical Canvas & Rail (Chosen)

```
+-------------------------------------------------------------------------+
| [A] Header: Welcome, Active Workspace, and Observation Gate             |
+----------------------------------------------------+--------------------+
|                                                    |                    |
|  [B] Primary Canvas (Wide Column)                  | [C] Secondary Rail |
|                                                    |     (Narrow)       |
|  +----------------------------------------------+  |  +--------------+  |
|  | Today's Narrative Summary                    |  |  | Observation  |  |
|  | (Plain conversational text of active work)   |  |  | Status Card  |  |
|  +----------------------------------------------+  |  +--------------+  |
|                                                    |  +--------------+  |
|  +----------------------------------------------+  |  | focus rhythm |  |
|  | Timeline Preview Card                        |  |  | breakdown    |  |
|  | (5 most recent milestone events)             |  |  +--------------+  |
|  +----------------------------------------------+  |  +--------------+  |
|                                                    |  | AI Insights  |  |
|  +----------------------------------------------+  |  | patterns     |  |
|  | Projects Index                               |  |  +--------------+  |
|  | (Active directories / watched files list)    |  |                    |
|  +----------------------------------------------+  |                    |
|                                                    |                    |
+----------------------------------------------------+--------------------+
```

- _Trade-offs_: Asymmetrical columns focus 70% of the screen width on narrative summaries and chronological timelines, while reserving the remaining 30% for status dials, focus graphs, and insights. This hierarchy establishes a single visual hero (the Narrative) and matches developer scanning rhythms perfectly.

---

## 3. Tablet Layout

Tablet displays compress the asymmetrical layout into a stacked single-column design, adapting to medium screen sizes while preserving focus boundaries:

```
+-------------------------------------------------------------------+
| [A] Header: Welcome, Active Workspace, and Observation Gate       |
+-------------------------------------------------------------------+
|                                                                   |
|  [B] Today's Narrative Summary                                    |
|                                                                   |
+-------------------------------------------------------------------+
|                                                                   |
|  [C] Focus Rhythm Breakdown & AI Insights (Horizontal Grid)       |
|  +---------------------------------+---------------------------+  |
|  | focus rhythm breakdown          | AI Insights patterns      |  |
|  +---------------------------------+---------------------------+  |
|                                                                   |
+-------------------------------------------------------------------+
|                                                                   |
|  [D] Timeline Preview Card                                        |
|                                                                   |
+-------------------------------------------------------------------+
|                                                                   |
|  [E] Projects Index                                               |
|                                                                   |
+-------------------------------------------------------------------+
```

---

## 4. Mobile Layout

Mobile viewports use a strict vertical layout. Spacing margins are compressed, and the secondary rail cards flow below the primary canvas:

```
+------------------------------------------+
| [A] Workspace Header                     |
+------------------------------------------+
| [B] Observation Gate Toggle              |
+------------------------------------------+
|                                          |
|  [C] Today's Narrative Summary           |
|                                          |
+------------------------------------------+
|                                          |
|  [D] Focus Rhythm Breakdown              |
|                                          |
+------------------------------------------+
|                                          |
|  [E] AI Insights Patterns                |
|                                          |
+------------------------------------------+
|                                          |
|  [F] Timeline Preview Card               |
|                                          |
+------------------------------------------+
|                                          |
|  [G] Projects Index                      |
|                                          |
+------------------------------------------+
```

---

## 5. Primary Canvas

The Primary Canvas occupies the central, left-hand section of the desktop screen, spanning approximately 70% of the viewport width.

- **Narrative Dominance**: It hosts today’s narrative summary card. Because this card represents the conceptual headline of the workday, it is given the largest spatial footprint.
- **Readability**: By dedicating a wide area to the narrative, text lines maintain comfortable lengths (50–75 characters) without being squeezed into narrow cards.

---

## 6. Secondary Rail

The Secondary Rail sits on the right-hand side of the screen, occupying approximately 30% of the layout width.

- **Supportive Focus**: It holds status cards, focus distribution graphs, and AI pattern insights.
- **Restraint**: The rail functions as a dashboard accessory. Its cards utilize smaller typography scales and lower contrast levels to ensure they do not compete with the primary narrative.

---

## 7. Timeline Placement

The Timeline Preview is placed on the Primary Canvas directly below today’s narrative summary card.

- **Chronological Evidence**: The timeline provides the structural proof of the narrative summary. By placing it immediately beneath the story card, the developer's eye moves naturally from the written summary to the chronological events that support it.

---

## 8. Projects Placement

The Projects Index is positioned at the bottom of the Primary Canvas.

- **Low Frequency**: Unlike the active session narrative or focus logs, project directory settings change infrequently. Keeping this module at the bottom ensures it is accessible when needed, but never occupies valuable visual space.

---

## 9. Visual Weight

Visual weight is managed through scale, depth, and contrast, separating components into distinct size tiers:

- **Large (Today's Narrative Summary)**: Strong visual presence. Uses generous line-heights and slightly elevated container depth.
- **Medium (Timeline Preview & Focus Rhythm)**: Standard body copy size with clearly outlined card boundaries.
- **Small (Project Directories & AI Insights)**: Muted typography with narrow margins.
- **Micro (Timestamps, Commit Hashes, Watcher Counts)**: Monospaced typography, small scale, and low contrast, sitting in secondary positions.

---

## 10. Responsive Behaviour

Visual layouts scale fluidly between viewports:

- **Desktop-to-Tablet**: The secondary rail columns detach from the right side and stack horizontally below the narrative card.
- **Tablet-to-Mobile**: Horizontal columns wrap into a single vertical stream. Padding values collapse to maximize content width.

---

## 11. Scrolling Behaviour

Scrolling is managed to maintain active context and orientation:

- **Fixed Header**: The top header (welcome line, active workspace, observation gate toggle) remains permanently fixed at the top of the viewport. The developer always knows whether telemetry is active, regardless of scroll depth.
- **Scrollable Canvas**: The primary canvas and secondary rail scroll vertically as a unified page. Independent inner-card scrolling is prohibited, as it creates double-scrollbars and increases friction.

---

## 12. Whitespace Strategy

Whitespace is treated as an active layout separator rather than empty space:

- **Zone Margins**: Layout zones are separated by a consistent spacing unit. This visual separator allows sections to remain distinct without relying on borders.
- **Inner Padding**: Cards maintain generous internal padding (gutter boundaries) to ensure text never touches container borders, preserving a calm reading rhythm.

---

## 13. Reading Path

The reading path follows a vertical Z-pattern down the page:

```
[1] Welcome & Status (Top Header - Left to Right check)
           ↓
[2] Today's Narrative (Primary Canvas - Focus entry)
           ↓
[3] Focus & Status (Secondary Rail - Quick glance check)
           ↓
[4] Timeline Events (Primary Canvas - Deep verification)
           ↓
[5] Projects & Configuration (Bottom - Action options)
```

By structuring information to match this flow, the interface eliminates diagonal search confusion and guides the eye naturally.

---

## 14. Dashboard Signature

The Dashboard's visual signature is the **Narrative Summary Card**.

- **Why**: It is the conceptual anchor of DepRadar. By elevating conversational prose over charts and metrics, this card defines the product’s identity. If all logos are removed, the narrative card instantly identifies DepRadar.

---

## 15. Anti-Patterns

The wireframe layout prohibits the following structural patterns:

- **Multi-Column Metrics Grid**: Splitting the dashboard into four equal columns filled with charts.
- **Nested Scrollbars**: Placing independent scrollbars inside timeline lists or project lists.
- **Centered Layouts**: Centering project names or timeline events in the middle of wide columns.
- **Competing Heroes**: Placing a giant focus pie chart next to the narrative card with equal visual width.

---

## 16. Success Criteria

The wireframe layout succeeds when:

1.  **Readability is Immediate**: The user immediately identifies the primary narrative within one second of landing on the page.
2.  **Rhythm is Maintained**: The vertical spacing guides the eye smoothly from the summary to timeline details.
3.  **Containment is Safe**: Responsive wrapping preserves all information boundaries across desktop, tablet, and mobile displays without truncating critical paths.
