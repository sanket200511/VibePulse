# Correlation & Causality Graph — Forensic UI/UX Audit & Correction Plan

**Date:** 2026-08-25  
**Focus:** Visual Composition, Spatial Intelligence, and Causal Storytelling

---

## 1. Forensic Audit of the Previous Implementation Failures

### Why the previous 7-layer layout failed:

1. **Rigid Static Absolute Columns:**
   - The canvas assigned nodes to static columns $X = 140 + \text{layer} \times 220\text{px}$ across an artificial 1800px coordinate system.
   - In a focused neighborhood (e.g. `Depth = 1` around a finding or incident), almost all active entities belonged to layers 3, 4, and 5. This pushed all nodes to the far right edge of the screen ($X \ge 1000\text{px}$).
   - The left 70% of the canvas was completely empty.
2. **Missing/Broken Auto-Fit:**
   - The canvas defaulted to static pan $(60, 40)$ and zoom $0.95$, ignoring where the visible nodes were situated.
   - Connected bezier curves originating from earlier layers entered from the far left off-screen, creating a broken visual impression.
3. **No Central Visual Anchor:**
   - The selected node was not at the center; it was merely one of the nodes in its column.
   - The user had no visual focal point for the investigation.
4. **Inspector Disconnection & Empty Space:**
   - When nothing was selected, an oversized empty placeholder card dominated the right side.
   - When selected, excessive vertical height created empty regions instead of concise, high-density intelligence.
5. **Toolbar Clutter & Competing Badges:**
   - Top area contained redundant KPI counters, layer headers (`1. Observations`, `2. Code Surface`...), and minimaps that competed for attention with the graph.

---

## 2. What Must Be Retained vs Removed

| Component / Logic                        | Status     | Action                                                                                                   |
| :--------------------------------------- | :--------- | :------------------------------------------------------------------------------------------------------- |
| **Backend API & Grounded Data**          | **RETAIN** | Keep PostgreSQL grounded queries, edge explanations, root-cause walks, and impact walks. Zero mock data. |
| **URL Parameter Synchronization**        | **RETAIN** | Keep `?node=`, `?mode=`, `?view=`, `?depth=`.                                                            |
| **Multi-Hop Traversal Engine**           | **RETAIN** | Keep backward root cause walk and forward impact walk.                                                   |
| **Rigid 7-Column Static Layout**         | **REMOVE** | Replace with **Focused Causal-Radial Layout** centered on the selected entity.                           |
| **Hardcoded Canvas Width / Coordinates** | **REMOVE** | Replace with **Dynamic Viewport Bounding-Box Auto-Fit** (75–85% viewport utilization).                   |
| **Static Minimap & Column Headers**      | **REMOVE** | Eliminate visual noise and distraction.                                                                  |
| **Oversized Empty Inspector**            | **REWORK** | Compact state with instant entity selection chips when idle; high-density intelligence when active.      |
| **Unbounded Node Spreading**             | **REWORK** | Strict progressive disclosure: 5–12 nodes maximum by default.                                            |

---

## 3. Redesign Architecture & Layout Mathematics

### 3.1 Focused Causal Neighborhood Layout

The selected entity is placed strictly at $(0, 0)$ as the visual anchor:

```
                  [ Subsystem ]
                     (0, -110)
                        ▲
                        │
[ Event ]  ──► [ File ] ──► [ SELECTED ENTITY ] ──► [ Incident ] ──► [ Health / Impact ]
(-440, 0)      (-220, 0)          (0, 0)                (220, 0)             (440, 0)
                                                           │
                                                           ▼
                                                     [ Prediction ]
                                                       (220, 110)
```

1. **Upstream Causes ($X < 0$):**
   - Incoming causal edges (Events, Files, Findings triggering the entity) are sequenced to the left:
     - Direct cause: $X = -220\text{px}$
     - Root/upstream cause: $X = -440\text{px}$
2. **Downstream Impacts ($X > 0$):**
   - Outgoing causal edges (Incidents, Health dimensions, Predictions) are sequenced to the right:
     - Direct impact: $X = +220\text{px}$
     - Final forecast / project impact: $X = +440\text{px}$
3. **Structural Context ($Y \ne 0$):**
   - Subsystem, Technologies, Project parent nodes are positioned vertically ($Y = \pm 110\text{px}$) with small $X$ offsets.
4. **Multiple Nodes in Same Direction:**
   - Symmetrically distributed along $Y$ ($Y = 0, \pm 80, \pm 160\text{px}$) to completely eliminate node or label collisions.

### 3.2 Dynamic Intelligent Viewport Auto-Fit

Upon any selection, search, traversal step, or expansion:

1. Compute bounding box: $[X_{\min} - 60, Y_{\min} - 50, X_{\max} + 60, Y_{\max} + 50]$.
2. Compute `scale = min(viewportWidth / bboxWidth, viewportHeight / bboxHeight) * 0.82`.
3. Center viewport directly on $[X_{\text{mid}}, Y_{\text{mid}}]$.
4. Result: **The active graph perfectly occupies 80% of the canvas with zero clipped edges and zero empty voids.**

---

## 4. Execution Plan

1. **Phase 1: Canvas Layout & Rendering Engine**
   - Rewrite `CorrelationGraphCanvas.tsx` with Focused Causal Neighborhood layout and dynamic auto-fit.
   - Implement crisp horizontal bezier routing with directional arrows.
   - Implement prominent selected-node visual halo.
2. **Phase 2: Inspector Streamlining**
   - Rewrite `CorrelationGraphInspector.tsx` to provide immediate high-density intelligence without empty panel syndrome.
3. **Phase 3: Toolbar & Header Cleanup**
   - Simplify `KnowledgeGraphPage.tsx` into a clean, modern intelligence command strip.
4. **Phase 4: Verification & Live Browser Validation**
   - Verify on `DepRadar-Seminar-Demo` with `settings.py`, `SEC001`, root-cause traversal, and search.
