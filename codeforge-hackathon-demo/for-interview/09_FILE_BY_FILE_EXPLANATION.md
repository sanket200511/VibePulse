# 📂 09. File-by-File Codebase Index & Responsibilities

This document provides an exhaustive index of every key source file in the repository and its explicit responsibility.

---

## 🎨 Dashboard Application (`apps/dashboard/src/`)

- [`pages/knowledge-graph/KnowledgeGraphPage.tsx`](file:///d:/VibeSync/apps/dashboard/src/pages/knowledge-graph/KnowledgeGraphPage.tsx): Main graph page controller managing search, mode filters, depth buttons, traversal steppers, and layout grid.
- [`pages/knowledge-graph/CorrelationGraphCanvas.tsx`](file:///d:/VibeSync/apps/dashboard/src/pages/knowledge-graph/CorrelationGraphCanvas.tsx): Custom SVG graph renderer implementing cursor-centered zoom, drag-to-pan, radial causal positioning, BFS neighborhood isolation, and YouTube-like fullscreen mode.
- [`pages/knowledge-graph/CorrelationGraphInspector.tsx`](file:///d:/VibeSync/apps/dashboard/src/pages/knowledge-graph/CorrelationGraphInspector.tsx): High-density intelligence panel (28% grid col) presenting entity details, risk points, evidence links, and traversal action buttons.
- [`pages/knowledge-graph/types.ts`](file:///d:/VibeSync/apps/dashboard/src/pages/knowledge-graph/types.ts): TypeScript type definitions for `KnowledgeGraphNode`, `KnowledgeGraphEdge`, `GraphMode`, and traversal steps.
- [`pages/knowledge-graph/useKnowledgeGraph.ts`](file:///d:/VibeSync/apps/dashboard/src/pages/knowledge-graph/useKnowledgeGraph.ts): Custom React Query hooks fetching graph topology, root cause traversals, impact walks, timelines, and before/after comparisons.
- [`pages/evidence/EvidenceInspector.tsx`](file:///d:/VibeSync/apps/dashboard/src/pages/evidence/EvidenceInspector.tsx): Grounded evidence modal rendering raw code diffs, CWE vulnerability classifications, and line numbers.

---

## 🐍 Backend API (`apps/api/app/`)

- `main.py`: Application entry point initializing FastAPI instance, middleware, CORS policies, and routing tables.
- `core/config.py`: Pydantic V2 settings loading environment variables (`PORT=5184`, `DATABASE_URL`).
- `core/database.py`: Async SQLAlchemy 2.0 engine and session generator.
- `features/knowledge_graph/router.py`: REST router exposing endpoints for knowledge graph retrieval, root cause traversal, and impact calculation.
- `features/knowledge_graph/service.py`: Business logic executing BFS graph traversals, health score aggregations, and Bayesian predictions.

---

## ⚙️ Daemon Watcher (`apps/daemon/src/`)

- `index.ts`: Daemon startup script opening HTTP listener on port `5185` and launching watch tasks.
- `watch-manager.ts`: Chokidar file watcher listening for filesystem mutations and executing debounced AST scans.
- `publisher/http-publisher.ts`: Resilient HTTP client streaming telemetry events to FastAPI port `5184`.

---

## 📦 Shared Packages & Configuration

- `packages/config/src/ports.ts`: Single source of truth for canonical port numbers (`Dashboard: 5183`, `API: 5184`, `Daemon: 5185`, `Postgres: 5432`).
- `packages/ui/src/components/`: Reusable React components (`Badge`, `Button`, `Card`, `Modal`).
