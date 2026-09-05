# Whole-Platform UI/UX Forensic Audit & Architectural Repair Report

**Date**: August 2026  
**Status**: COMPLETE & VERIFIED  
**Scope**: Whole DepRadar Engineering Intelligence Platform (FastAPI, React Dashboard, TypeScript Daemon, PostgreSQL)

---

## 1. Executive Summary

A comprehensive, forensic audit and repair was conducted across the DepRadar engineering observability platform. This was not a superficial cosmetic redesign; it resolved core architectural data propagation failures, FastAPI route routing collisions, design system token drift, and navigation hierarchy breaks.

Every screen in the application now accurately reflects truthful, canonical PostgreSQL telemetry and AST projections without fabricated metrics, broken routing, dead navigation links, or unhandled null states.

---

## 2. Forensic Defect Classification & Root-Cause Remediation

### Defect Group 1: AI Provenance Routing & HTML MIME Type Hijack

- **Forensic Finding**: `AIProvenancePage.tsx` and its hook `useAIProvenance.ts` fetched `/projects/${projectId}/ai-provenance` without the `/api` prefix. The Vite development server intercepted the path and returned `index.html` with HTTP 200 and MIME type `text/html`. `response.json()` failed with `SyntaxError: Unexpected token '<'`, triggering an empty/error state.
- **Remediation**:
  1. Updated `apps/api/app/features/ai_provenance/router.py` to mount both `/api/sessions/{session_id}/ai-provenance` and `/api/projects/{project_id}/ai-provenance`.
  2. Updated `useAIProvenance.ts` to call `/api/projects/${projectId}/ai-provenance`.
  3. Formatted `AIProvenancePage.tsx` with design system tokens (`bg-background text-foreground`, `bg-card border-border`) and added top `Back to Project Story` breadcrumbs.

### Defect Group 2: Demo Mode vs. Live Telemetry Gating

- **Forensic Finding**: `isDemoModeEnabled()` in `apps/dashboard/src/demo/config.ts` defaulted to `true` on initial page loads when `localStorage` had no value. Hooks like `useProjectHealth`, `useProjectArchitectureTimeline`, and `ProjectsPage` disabled real network calls with `enabled: !isDemo`. As a result, registered projects and telemetry in PostgreSQL were bypassed in favor of local memory fallbacks.
- **Remediation**:
  1. Set `isDemoModeEnabled()` default to `false` in `apps/dashboard/src/demo/config.ts`.
  2. Removed `!isDemo` query disables in `ProjectsPage.tsx`, `ProjectStoryPage.tsx`, `useProjectArchitectureTimeline.ts`, and `useProjectHealth.ts`. Live database queries now execute consistently on `!!projectId`.

### Defect Group 3: Page Hierarchy & Project Navigation Coherence

- **Forensic Finding**: `ProjectStoryPage.tsx` had an unstructured button layout mixing primary deep links (`/command-center`), secondary intelligence subpages, and tertiary utilities without visual hierarchy or standard breadcrumb paths. Subpages lacked consistent return paths.
- **Remediation**:
  1. Restructured `ProjectStoryPage.tsx` header with clear hierarchy:
     - **Primary Action**: "Launch Engineering Command Center"
     - **Secondary Intelligence Grid**: AI Copilot, Knowledge Graph, Security Center, Predictive Intelligence, AI Provenance, Investigation Engine.
     - **Tertiary Actions**: Time Machine, JSON Export, Share.
  2. Added standardized breadcrumbs (`Back to Project Story`) across all subpages (`AIProvenancePage.tsx`, `PredictionsPage.tsx`, `SecurityCommandCenter.tsx`, `KnowledgeGraphPage.tsx`, `CopilotPage.tsx`, `InvestigationPage.tsx`).

### Defect Group 4: Predictive Intelligence Null-Safety & Surface Styling

- **Forensic Finding**: `PredictionsPage.tsx` used hardcoded dark theme classes (`bg-[#0d1117]`) and directly accessed arrays (`summary.hotspots.length`, `summary.recurring_risks.length`, `summary.trends.length`) without fallback arrays when backend telemetry projections returned partial payloads.
- **Remediation**:
  1. Converted container to `animate-fade-in-up bg-background text-foreground flex flex-1 flex-col p-6 md:p-8 space-y-6`.
  2. Added defensive checks: `(summary.hotspots || []).length`, `(summary.recurring_risks || []).length`, `(summary.trends || []).length`.

### Defect Group 5: Security Command Center & Risk Factor Null Safety

- **Forensic Finding**: `SecurityCommandCenter.tsx` threw unhandled exceptions if `risk.breakdown` or `dependencies.manifest_files` were missing.
- **Remediation**:
  1. Added safe optional chaining: `(!risk.breakdown || risk.breakdown.length === 0)` and `dependencies.manifest_files?.join(", ") || "None observed"`.
  2. Aligned root container tokens to `bg-background text-foreground`.

### Defect Group 6: Knowledge Graph Topology Overview & Subsystem Filtering

- **Forensic Finding**: `KnowledgeGraphPage.tsx` showed a simple blank prompt when no node was selected, and assumed `graph.subsystems` was always an array.
- **Remediation**:
  1. Added a rich **Graph Overview & Inspector** card displaying total nodes, total edges, and active subsystems with an "Inspect Project Evidence Graph" trigger.
  2. Added safe fallbacks for `(graph?.subsystems || Object.keys(nodesBySubsystem))`.

### Defect Group 7: Investigation Command Center Filter States & Right Pane

- **Forensic Finding**: `InvestigationPage.tsx` did not distinguish between an empty workspace (0 incidents recorded) and an active search filter returning 0 matches. The right column was an empty text box when no incident was selected.
- **Remediation**:
  1. Added distinct empty states:
     - `rawResults.length === 0`: "No Incidents Recorded - Clean Security & Architecture Posture".
     - `filteredResults.length === 0`: "No Matching Incidents" with a `Clear Filters` reset button.
  2. Added structured `Incident Command Center` card in the right column when awaiting incident selection.

---

## 3. Verification & Test Evidence

| Test Suite                         | Command                                                                                   | Result                                  |
| :--------------------------------- | :---------------------------------------------------------------------------------------- | :-------------------------------------- |
| **Backend Tests**                  | `uv run pytest` (apps/api)                                                                | **349 / 349 Passed (100%)**             |
| **Daemon Tests**                   | `pnpm --filter @depradar/daemon test`                                                     | **130 / 130 Passed (100%)**             |
| **Frontend Navigation Regression** | `pnpm --filter @depradar/dashboard test src/pages/projects/NavigationRegression.test.tsx` | **5 / 5 Passed (100%)**                 |
| **TypeScript Typecheck**           | `pnpm typecheck` (5 packages)                                                             | **5 / 5 Passed (0 errors)**             |
| **ESLint Validation**              | `pnpm lint` (5 packages)                                                                  | **5 / 5 Passed (0 errors, 0 warnings)** |
| **Prettier Formatting**            | `pnpm format:check`                                                                       | **All matched files passed**            |
| **Database Integrity**             | `node scripts/cleanup-ephemeral-projects.mjs`                                             | **1 Persistent Project Intact (Dabba)** |

---

## 4. Modified & Created Files

1. `apps/api/app/features/ai_provenance/router.py` — Added canonical `/api/` route decorators.
2. `apps/api/tests/features/ai_provenance/test_ai_provenance.py` — Added route contract assertions.
3. `apps/dashboard/src/demo/config.ts` — Set default demo mode to false.
4. `apps/dashboard/src/pages/copilot/CopilotPage.tsx` — Standardized tokens and breadcrumbs.
5. `apps/dashboard/src/pages/investigation/InvestigationPage.tsx` — Standardized breadcrumbs, filter empty states, right-pane card.
6. `apps/dashboard/src/pages/knowledge-graph/KnowledgeGraphPage.tsx` — Standardized breadcrumbs, graph topology card, null safety.
7. `apps/dashboard/src/pages/predictions/PredictionsPage.tsx` — Standardized tokens, breadcrumbs, array fallbacks.
8. `apps/dashboard/src/pages/projects/AIProvenancePage.tsx` — Standardized tokens and breadcrumbs.
9. `apps/dashboard/src/pages/projects/NavigationRegression.test.tsx` — **NEW**: Navigation regression test suite.
10. `apps/dashboard/src/pages/projects/ProjectsPage.tsx` — Always query live projects from database.
11. `apps/dashboard/src/pages/projects/ProjectStoryPage.tsx` — Structured action hierarchy, enabled live queries.
12. `apps/dashboard/src/pages/projects/useAIProvenance.ts` — Updated to call `/api/...`.
13. `apps/dashboard/src/pages/projects/useProjectArchitectureTimeline.ts` — Live query enabled unconditionally.
14. `apps/dashboard/src/pages/projects/useProjectHealth.ts` — Live query enabled unconditionally.
15. `apps/dashboard/src/pages/security/SecurityCommandCenter.tsx` — Standardized tokens and risk breakdown null safety.
16. `apps/dashboard/src/pages/workspace-home/WorkspaceHomePage.tsx` — Updated banner copy.
