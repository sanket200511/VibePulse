# VibePulse Correlation & Causality Graph — Forensic Audit

**Audit Date:** 2026-08-25  
**Audited Subsystems:** Knowledge Graph, Investigation Engine 3.0, Security Intelligence, Unified Project Health, Predictive Intelligence, AI Copilot, Project Context, Frontend Dashboard  
**Status:** Canonical Baseline Verified — Ready for Extension

---

## 1. Executive Summary

This forensic audit evaluates VibePulse's existing Knowledge Graph foundation to establish the blueprint for extending it into a **Correlation & Causality Graph**.

VibePulse already possesses a deterministic graph projection engine in `apps/api/app/features/knowledge_graph` and a rich UI in `apps/dashboard/src/pages/knowledge-graph`. However, the current graph primarily models structural relationships (`CONTAINS`, `BELONGS_TO`, `ASSOCIATED_WITH`, `AFFECTS`, `RESOLVED_BY`, `SUPPORTS`, `CONTRIBUTES_TO`) in a grouped grid view.

To achieve complete causal traceability:
$$\text{OBSERVED EVENT} \longrightarrow \text{FINDING} \longrightarrow \text{INCIDENT} \longrightarrow \text{ROOT CAUSE / INVESTIGATION} \longrightarrow \text{HEALTH IMPACT} \longrightarrow \text{RESOLUTION} \longrightarrow \text{PREDICTION} \longrightarrow \text{PROJECT MEMORY}$$

we will extend the existing model with:

1. **Interactive Node-Link Visual Graph Canvas** (SVG/Canvas force-directed layout with pan, zoom, fit, and node highlight).
2. **Explicit Causal & Evidence-Backed Edges** with grounded "Why is this connected?" explanations.
3. **Graph Modes** (`RELATIONSHIP`, `INVESTIGATION`, `IMPACT`, `MEMORY`).
4. **Graph Traversal Engines**:
   - `TRACE ROOT CAUSE` (Backward walk from Project Health / Incident / Finding to Root Cause / Development Event).
   - `TRACE IMPACT` (Forward walk from File / Finding to Incident, Subsystem Health, and Predictions).
5. **Focus Neighborhood Mode** with Depth control (`[1]`, `[2]`, `[3]`).
6. **Chronological Timeline Projection** & **Before/After Resolution State**.
7. **Bidirectional Deep-Linking & Action Routing** (Linking to `/investigation?incidentId=...`, `/security`, `/predictions`, etc.).

All derivations remain 100% grounded in PostgreSQL telemetry (`development_events`, `event_analyses`, `sessions`, `projects`, `incident_review_states`, `incident_review_history`, `project_contexts`). **Zero fake data or speculative heuristics.**

---

## 2. Current Architecture Inspection

### 2.1 Backend (`apps/api/app/features/knowledge_graph/`)

- **`schemas.py`**:
  - `KnowledgeGraphNodeType`: `"Project"`, `"Subsystem"`, `"Directory"`, `"File"`, `"Technology"`, `"Framework"`, `"SecurityFinding"`, `"Incident"`, `"Prediction"`, `"Resolution"`, `"Session"`, `"HealthDimension"`, `"EngineeringPattern"`.
  - `RelationshipType`: `"CONTAINS"`, `"BELONGS_TO"`, `"MODIFIED_IN"`, `"ASSOCIATED_WITH"`, `"CONTRIBUTED_TO"`, `"AFFECTS"`, `"RESOLVED_BY"`, `"CONTRIBUTES_TO"`, `"SUPPORTS"`, `"USED_BY"`, `"DERIVED_FROM"`.
  - `KnowledgeGraphNode`: `node_id`, `node_type`, `project_id`, `label`, `subsystem`, `metadata`, `provenance`.
  - `KnowledgeGraphEdge`: `relationship_id`, `source_node_id`, `target_node_id`, `relationship_type`, `label`, `evidence_references`, `provenance`, `metadata`.
  - Projections: `ProjectKnowledgeGraph`, `FileIntelligenceView`, `SubsystemIntelligenceView`, `IncidentRelationshipView`, `ProjectMemory2`, `GraphSearchResult`.
- **`router.py`**:
  - `GET /api/projects/{id}/knowledge-graph`
  - `GET /api/projects/{id}/knowledge-graph/nodes`
  - `GET /api/projects/{id}/knowledge-graph/relationships`
  - `GET /api/projects/{id}/knowledge-graph/files/{path}`
  - `GET /api/projects/{id}/knowledge-graph/subsystems/{sub}`
  - `GET /api/projects/{id}/knowledge-graph/incidents/{inc}`
  - `GET /api/projects/{id}/knowledge-graph/memory`
  - `GET /api/projects/{id}/knowledge-graph/search`
  - `POST /api/projects/{id}/knowledge-graph/refresh`
- **`service.py`**:
  - Pure deterministic projection from PostgreSQL tables (`events`, `sessions`, `security_findings`, `incidents`, `predictions`, `project_context`, `health_dimensions`).
  - Strict `[REDACTED]` secret masking.

### 2.2 Related Intelligence Engines

- **Investigation Engine 3.0 (`apps/api/app/features/investigation/`)**:
  - Provides `EvidenceGraph3` (`EvidenceNode` & `EvidenceGraphEdge3`).
  - Provides `RootCauseAnalysis` (`primary_signal`, `contributing_signals`, `assessment`).
  - Provides `IncidentStory`, `TimelineStep3`, `RiskEvolution`, `EngineeringDNACorrelation`, and `AffectedSurfaceSummary`.
- **Evidence & Explainability (`apps/api/app/features/evidence/`)**:
  - Provides `explain_entity` for `health`, `security`, `incident`, `prediction`, `priority`.
  - Calculates exact score decompositions ($W_i \times S_i$) and causal step chains.
- **Predictive Intelligence (`apps/api/app/features/predictive_intelligence/`)**:
  - Forecast signals with affected files, affected subsystems, evidence strength, and trend slopes.

### 2.3 Frontend (`apps/dashboard/src/pages/knowledge-graph/`)

- **`types.ts`**: Mirrors backend schemas.
- **`useKnowledgeGraph.ts`**: React Query hooks for fetching full graph, file intelligence, subsystem intelligence, and search.
- **`KnowledgeGraphPage.tsx`**:
  - Renders top metric cards (Entities, Subsystems, Technologies, Incidents, Forecasts).
  - Subsystem filtering and search bar.
  - Subsystem card list with node mini-cards.
  - Simple side inspector.
  - Integration with `EvidenceInspector` modal.

---

## 3. Gap Analysis & Missing Capabilities

| Capability                          | Current State                    | Required State                                                                                                                    |
| :---------------------------------- | :------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| **Interactive Graph Visualization** | Subsystem grid grouping only     | Interactive Canvas/SVG Node-Link network with force layout, zoom/pan, node dragging, and neighborhood highlight                   |
| **Edge Explanation & Evidence**     | Simple string label on edge      | Rich "Why is this connected?" explanation panel displaying source file, finding ID, incident ID, score impact, and evidence links |
| **Graph Modes**                     | None (Single all-entity view)    | 4 Dedicated Modes: `RELATIONSHIP`, `INVESTIGATION`, `IMPACT`, `MEMORY`                                                            |
| **Root Cause Traversal**            | Isolated inside `/investigation` | Interactive graph traversal from Project Health / Incident / Finding walking backward to root cause events                        |
| **Impact Traversal**                | Not present                      | Forward traversal from File / Finding to Incidents, Health Dimensions, and Forecasts                                              |
| **Neighborhood Focus Mode**         | All nodes always shown           | Focus on selected node with Depth `[1]`, `[2]`, `[3]` and `[Show Full Graph]`                                                     |
| **Timeline View**                   | Not integrated in KG             | Toggleable `GRAPH` \| `TIMELINE` sequence backed by verified event timestamps                                                     |
| **Before / After Resolution**       | Not present in KG                | Compare graph state pre-remediation vs post-remediation (resolved findings & incidents)                                           |
| **Deep-Linking & Routing**          | No URL query synchronization     | URL sync (`?node=...&mode=...&focus=...`) with seamless actions to `/investigation`, `/security`, `/predictions`                  |

---

## 4. Reusable Functionality Inventory

1. **Backend Graph Projection (`service.py`)**:
   - `build_project_knowledge_graph` already aggregates files, findings, incidents, predictions, health dimensions, and review states.
   - Can be extended with `DevelopmentEvent` node mapping, explicit root cause nodes, and traversal endpoints (`/trace/root-cause`, `/trace/impact`).
2. **Evidence Explainability Engine (`apps/api/app/features/evidence/service.py`)**:
   - `explain_entity` provides grounded mathematical decompositions and evidence chains ready for edge reasoning.
3. **Investigation 3.0 Engine (`apps/api/app/features/investigation/service.py`)**:
   - `get_incident_detail_3` already computes causal root cause and risk evolution.
4. **Secret Masking & Security Invariants (`_mask_secret`)**:
   - Proven regex masking ensures zero credential exposure across all graph nodes and edges.
5. **Breadcrumbs & UI Component System (`@vibepulse/ui`)**:
   - High-contrast dark theme badges, modals, and buttons.

---

## 5. Risk Assessment & Mitigations

1. **Performance with Large Graphs**:
   - _Risk_: Rendering hundreds of nodes could degrade DOM performance.
   - _Mitigation_: Canvas/SVG force layout with bounded rendering, virtualized node limits, and Subsystem Clustering mode.
2. **Data Truthfulness**:
   - _Risk_: Inferring relationships that don't exist in PostgreSQL.
   - _Mitigation_: Only create edges where explicit foreign keys, file paths, rule IDs, or incident IDs match. When evidence is missing, explicitly report `"Insufficient evidence to establish this relationship."`
3. **Secret Redaction**:
   - _Risk_: Node labels or metadata leaking passwords/tokens.
   - _Mitigation_: All evidence text filtered through `_mask_secret` (`[REDACTED]` / `[MASKED]`).
4. **Multi-Project Isolation**:
   - _Risk_: Project A entities appearing in Project B.
   - _Mitigation_: Every query filtered strictly by `project_id` and normalized `project_root`.

---

## 6. Implementation Strategy & Phase Roadmap

- **PHASE 1: Graph Model & Data Extension**
  - Add `DevelopmentEvent`, `RootCause`, `Actor` node types and `CAUSED`, `INVESTIGATED_BY`, `RESOLVED`, `PART_OF` relationship types in backend and frontend schemas.
  - Enrich edge metadata with grounded `reason` and `evidence_details`.
- **PHASE 2: Backend Traversal & Query Services**
  - Implement `/api/projects/{id}/knowledge-graph/trace/root-cause` and `/trace/impact` endpoints.
  - Implement `/api/projects/{id}/knowledge-graph/timeline` projection.
- **PHASE 3: Interactive Visual Graph Component**
  - Build `CorrelationGraphCanvas.tsx` with smooth force simulation, interactive pan/zoom, node dragging, click selection, and SVG edge arrows.
- **PHASE 4: Reusable Inspector Component**
  - Build `CorrelationGraphInspector.tsx` supporting node inspection (type, severity, status, source, actions) and edge inspection ("Why is this connected?" + evidence).
- **PHASE 5: Search, Filter, and Focus Mode**
  - Build instant search centering, node-type / subsystem filters, and neighborhood focus depth (`[1]`, `[2]`, `[3]`).
- **PHASE 6: Root Cause & Impact Traversal UI**
  - Build interactive traversal path overlay with stepping, stopping reasons, and direct action triggers.
- **PHASE 7: Navigation & URL Deep-Linking**
  - Synchronize URL params (`?node=...&mode=...&focus=...`) and implement navigation handlers to existing pages.
- **PHASE 8: Timeline & Before/After Resolution Views**
  - Implement `GRAPH` \| `TIMELINE` mode toggle and `BEFORE` \| `AFTER` remediation comparison.
- **PHASE 9: Comprehensive Automated Tests**
  - Backend pytest tests (graph projection, traversal, evidence, isolation, secret redaction).
  - Frontend Vitest tests (selection, inspector, focus mode, traversal, deep-linking).
- **PHASE 10: Live Seminar Demo Validation**
  - Validate against `VibePulse-Seminar-Demo` in browser runtime.
- **PHASE 11: Final Implementation Documentation**
  - Create `docs/audits/CORRELATION_GRAPH_IMPLEMENTATION.md`.
