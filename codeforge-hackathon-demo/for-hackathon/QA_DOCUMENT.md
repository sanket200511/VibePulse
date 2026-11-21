# 🧪 VibePulse — QA, Test Matrix & Verification Document

This document outlines the testing strategy, automated test commands, vitest coverage, and manual QA checklist for VibePulse.

---

## 🎯 Automated Testing Suite Summary

VibePulse includes comprehensive unit, integration, and E2E regression tests across all monorepo packages.

| Package                | Test Framework                 | Test Files                                                          | Command                                   |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------- | ----------------------------------------- |
| `@vibepulse/dashboard` | Vitest + React Testing Library | `CorrelationGraph.test.tsx`, `NavigationRegression.test.tsx`        | `pnpm --filter @vibepulse/dashboard test` |
| `@vibepulse/api`       | Pytest + HTTPX Async           | `tests/test_knowledge_graph.py`, `tests/test_events_router.py`      | `cd apps/api && uv run pytest`            |
| `@vibepulse/daemon`    | Vitest + Node mocks            | `src/watch-manager.test.ts`, `src/publisher/http-publisher.test.ts` | `pnpm --filter @vibepulse/daemon test`    |
| **Monorepo Typecheck** | Pyright + TypeScript (`tsc`)   | All packages                                                        | `pnpm typecheck`                          |

---

## ⚡ Execution Commands

### 1. Run Complete Monorepo Typecheck

```powershell
$env:PATH = "D:\Apps Data\NodeJs;" + $env:PATH
pnpm typecheck
```

_Expected Output: `Tasks: 5 successful, 5 total` (0 errors across API, Dashboard, Daemon, UI, Config)._

### 2. Run Dashboard Unit & Navigation Tests

```powershell
pnpm --filter @vibepulse/dashboard test src/pages/knowledge-graph/CorrelationGraph.test.tsx src/pages/projects/NavigationRegression.test.tsx
```

---

## 📋 Manual QA Test Matrix

| ID        | Test Scenario        | Steps                              | Expected Result                                                            | Pass/Fail |
| --------- | -------------------- | ---------------------------------- | -------------------------------------------------------------------------- | --------- |
| **QA-01** | Graph Radial Layout  | Load `/knowledge-graph`            | Selected node is centered; upstream entities on left, downstream on right. | ✅ PASS   |
| **QA-02** | Search & Selection   | Type `settings.py` in search bar   | Graph smooth pans to `settings.py` at $(0,0)$; Inspector updates.          | ✅ PASS   |
| **QA-03** | Mode Filtering       | Click `Investigation` mode         | Graph filters out unrelated subsystem nodes, keeping causal chain.         | ✅ PASS   |
| **QA-04** | Depth Control        | Click Depth `1`, `2`, `3`, `All`   | Neighborhood expands symmetrically; auto-fit maintains 80% viewport.       | ✅ PASS   |
| **QA-05** | Root Cause Traversal | Click `Trace Root Cause`           | Unrelated nodes dim; causal path highlights with step banner controls.     | ✅ PASS   |
| **QA-06** | Fullscreen Toggle    | Press `F` or click Fullscreen icon | Wrapper enters native fullscreen; press `Esc` to return smoothly.          | ✅ PASS   |
| **QA-07** | Cursor-Centered Zoom | Scroll mouse wheel over node       | Canvas zooms in/out pinned directly to cursor position.                    | ✅ PASS   |
| **QA-08** | Evidence Modal       | Click `View Grounded Evidence`     | Evidence modal opens showing line-level code diff and CWE info.            | ✅ PASS   |
