# 💻 04. Code Walkthrough Script for Staff & Principal Engineers

This document provides a step-by-step transcript and explanation guide for walking senior engineering interviewers through the codebase.

---

## 📍 Step 1: Navigating the Monorepo Structure

> "Let's start by looking at `package.json` and `turbo.json`. We run a pnpm workspace with 3 core applications (`apps/api`, `apps/daemon`, `apps/dashboard`) and 2 shared packages (`packages/config`, `packages/ui`). All microservices follow single-command orchestration via `pnpm dev`."

---

## 📍 Step 2: The Custom Radial Canvas (`CorrelationGraphCanvas.tsx`)

Open [`apps/dashboard/src/pages/knowledge-graph/CorrelationGraphCanvas.tsx`](file:///d:/VibeSync/apps/dashboard/src/pages/knowledge-graph/CorrelationGraphCanvas.tsx):

> "Here is our custom SVG canvas engine. Notice three key algorithmic implementations:
>
> 1. **`activeAnchorId` & `visibleNeighborhoodIds`**: Uses BFS to isolate the neighborhood based on `focusDepth` (1, 2, 3, All).
> 2. **`calculateLayout`**: Computes multi-hop distances and assigns node columns: Upstream nodes to negative X ($X = -d \cdot 220$), Downstream nodes to positive X ($X = +d \cdot 220$).
> 3. **`fitVisibleGraph`**: Calculates the bounding box of all visible nodes and dynamically updates zoom and pan to maintain 80% viewport utilization."

---

## 📍 Step 3: Fast API & Async SQLAlchemy 2.0 (`apps/api`)

Open [`apps/api/app/features/knowledge_graph/service.py`](file:///d:/VibeSync/apps/api/app/features/knowledge_graph/service.py):

> "Over in the Python backend, we use FastAPI with SQLAlchemy 2.0 async session management. `get_knowledge_graph` queries nodes and edges from PostgreSQL, constructs pydantic validation schemas, and computes live health scores across 5 dimensions. Traversal endpoints (`/traversal/root-cause`) run BFS pathfinding from incidents back to original AST edits."

---

## 📍 Step 4: The Daemon Telemetry Watcher (`apps/daemon`)

Open [`apps/daemon/src/watch-manager.ts`](file:///d:/VibeSync/apps/daemon/src/watch-manager.ts):

> "Finally, the Daemon relies on Chokidar to intercept filesystem changes, feeds AST files to our regex/Babel guardians, and streams structured event payloads to the API on port `5184` with automatic retry handling."
