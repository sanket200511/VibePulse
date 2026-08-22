# VibePulse — Master Documentation Index & Authority Model

**Status**: Authoritative Master Index
**Project**: VibePulse (Deterministic Engineering Intelligence Platform & AI Copilot Foundation)
**Repository**: [https://github.com/sanket200511/VibePulse](https://github.com/sanket200511/VibePulse)

---

## 🏛️ Documentation Authority & Governance Model

To prevent documentation drift and maintain strict technical accuracy, all repository documents are categorized under the following authority levels:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AUTHORITY HIERARCHY                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Level 1: PRIMARY ENTRY POINTS       README.md, docs/DOCUMENTATION_INDEX.md │
│  Level 2: CURRENT / AUTHORITATIVE    ARCHITECTURE.md, PROJECT_STATUS.md,   │
│                                      ENGINEERING.md, SECURITY.md            │
│  Level 3: OPERATIONAL MANUALS        LOCAL_DEVELOPMENT.md, INSTALLATION.md, │
│                                      API_REFERENCE.md, DEPLOYMENT.md        │
│  Level 4: SUBSYSTEM DEEP DIVES       docs/SECURITY_INTELLIGENCE.md,         │
│                                      docs/INVESTIGATION_ENGINE_3.md, etc.   │
│  Level 5: ACADEMIC & DEFENSE         docs/FINAL_PROJECT_REPORT.md,          │
│                                      docs/RESEARCH_CONTRIBUTION.md, etc.    │
│  Level 6: DEMONSTRATION & RUNBOOKS   docs/FINAL_DEMO_RUNBOOK.md,            │
│                                      docs/SEMINAR_DEMO.md, DEMO.md          │
│  Level 7: HISTORICAL SNAPSHOTS       docs/SPRINT_14_TRUTH_AUDIT.md,         │
│                                      docs/adr/*, Sprint Reports             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📍 1. Primary Entry Points (Start Here)

| Document                                                                         | Authority                  | Scope / Description                                                                                        |
| -------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`README.md`](file:///d:/VibeSync/README.md)                                     | **Tier 1 (Authoritative)** | Executive project summary, architecture blueprint, metric triad, quickstart, and core guarantees.          |
| [`docs/DOCUMENTATION_INDEX.md`](file:///d:/VibeSync/docs/DOCUMENTATION_INDEX.md) | **Tier 1 (Authoritative)** | This document. Master inventory, classification, and sitemap of all project documents.                     |
| [`PROJECT_STATUS.md`](file:///d:/VibeSync/PROJECT_STATUS.md)                     | **Tier 2 (Authoritative)** | Live engineering status, verified test baselines (347 backend / 130 daemon tests), and sprint completions. |
| [`ARCHITECTURE.md`](file:///d:/VibeSync/ARCHITECTURE.md)                         | **Tier 2 (Authoritative)** | Comprehensive system architecture, data flow, PostgreSQL ground truth model, and intelligence pipeline.    |

---

## ⚙️ 2. Operational & Developer Guides

| Document                                                           | Authority                  | Scope / Description                                                                                                                         |
| ------------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [`LOCAL_DEVELOPMENT.md`](file:///d:/VibeSync/LOCAL_DEVELOPMENT.md) | **Tier 3 (Authoritative)** | Local environment setup, dedicated port configuration (`5133`/`5134`/`5135`), supervisor (`pnpm dev`), and diagnostics (`pnpm dev:status`). |
| [`INSTALLATION.md`](file:///d:/VibeSync/INSTALLATION.md)           | **Tier 3 (Authoritative)** | Prerequisites (Python 3.12, Node.js 22, pnpm 9, PostgreSQL 16), dependency sync, and database migration guide.                              |
| [`API_REFERENCE.md`](file:///d:/VibeSync/API_REFERENCE.md)         | **Tier 3 (Authoritative)** | REST & WebSocket endpoint contracts across Projects, Sessions, Events, Health, Investigations, KG, and Copilot.                             |
| [`SECURITY.md`](file:///d:/VibeSync/SECURITY.md)                   | **Tier 3 (Authoritative)** | Privacy guarantees, AST secret redaction policy (`[REDACTED]`), tenant isolation, and safe project deletion invariants.                     |
| [`DEPLOYMENT.md`](file:///d:/VibeSync/DEPLOYMENT.md)               | **Tier 3 (Authoritative)** | Containerized deployment reference via Docker & Compose (`docker-compose.yml`).                                                             |
| [`CONTRIBUTING.md`](file:///d:/VibeSync/CONTRIBUTING.md)           | **Tier 3 (Authoritative)** | Monorepo coding conventions, pull request workflows, typecheck/lint rules, and testing standards.                                           |
| [`FAQ.md`](file:///d:/VibeSync/FAQ.md)                             | **Tier 3 (Authoritative)** | Frequently asked questions regarding zero-LLM architecture, AST parsing, privacy, and deterministic replay.                                 |
| [`CHANGELOG.md`](file:///d:/VibeSync/CHANGELOG.md)                 | **Tier 3 (Authoritative)** | Historical milestone progression from Observation Engine to Copilot Foundation and Academic Packaging.                                      |

---

## 🧠 3. Subsystem Deep Dives (Intelligence Pipeline)

The canonical intelligence pipeline is:
$$\text{OBSERVE} \to \text{DETECT} \to \text{UNDERSTAND} \to \text{INVESTIGATE} \to \text{RESOLVE} \to \text{LEARN} \to \text{PREDICT} \to \text{ASK} \to \text{ACT} \to \text{MEMORY}$$

| Subsystem                           | Authoritative Guide                                                                                                                                                     | Key Capabilities & Artifacts                                                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Observation Engine**           | [`docs/adr/0012-daemon-event-pipeline.md`](file:///d:/VibeSync/docs/adr/0012-daemon-event-pipeline.md)                                                                  | Node.js telemetry daemon (`:5135`), Chokidar debouncing, gate control, and project registration.                                      |
| **2. Project Intelligence & DNA**   | [`docs/PROJECT_INTELLIGENCE.md`](file:///d:/VibeSync/docs/PROJECT_INTELLIGENCE.md)                                                                                      | Multi-session aggregation, developer activity timelines, file modification trends, and DNA classification.                            |
| **3. Security Intelligence 2.0**    | [`docs/SECURITY_INTELLIGENCE.md`](file:///d:/VibeSync/docs/SECURITY_INTELLIGENCE.md)                                                                                    | Tree-Sitter AST inspection, deterministic credential scanning (`SEC001`, `DEBUG_TRUE`), and automatic secret masking (`[REDACTED]`).  |
| **4. Investigation Engine 3.0**     | [`docs/INVESTIGATION_ENGINE_3.md`](file:///d:/VibeSync/docs/INVESTIGATION_ENGINE_3.md)                                                                                  | Causal DAG reconstruction, incident prioritization, root-cause derivation, and mathematical score decomposition.                      |
| **5. Resolution Intelligence**      | [`docs/INCIDENT_RESOLUTION.md`](file:///d:/VibeSync/docs/INCIDENT_RESOLUTION.md)                                                                                        | Multi-state review workflow (`TRIAGED`, `INVESTIGATING`, `MITIGATING`, `RESOLVED`, `FALSE_POSITIVE`) and durable audit trails.        |
| **6. Predictive Intelligence**      | [`docs/PREDICTIVE_INTELLIGENCE.md`](file:///d:/VibeSync/docs/PREDICTIVE_INTELLIGENCE.md)                                                                                | Churn acceleration analysis, hotspot identification, and regression risk forecasting.                                                 |
| **7. Unified Project Health**       | [`docs/PROJECT_HEALTH.md`](file:///d:/VibeSync/docs/PROJECT_HEALTH.md) & [`docs/SCORING_REFERENCE.md`](file:///d:/VibeSync/docs/SCORING_REFERENCE.md)                   | 5-dimension composite health score ($0\dots 100$, Higher=Better) and Metric Triad formulation.                                        |
| **8. Knowledge Graph & Memory 2.0** | [`docs/KNOWLEDGE_GRAPH.md`](file:///d:/VibeSync/docs/KNOWLEDGE_GRAPH.md) & [`docs/KNOWLEDGE_GRAPH_REFERENCE.md`](file:///d:/VibeSync/docs/KNOWLEDGE_GRAPH_REFERENCE.md) | Semantic multi-entity graph traversal (`CONTAINS`, `AFFECTS`, `RESOLVED_BY`), and portable `PROJECT_CONTEXT.md` AI handoff export.    |
| **9. AI Engineering Copilot**       | [`docs/COPILOT.md`](file:///d:/VibeSync/docs/COPILOT.md)                                                                                                                | 16 canonical query families, tri-state provenance (`[OBSERVED]`, `[INFERRED]`, `[UNKNOWN]`), Answerability Gate, zero-LLM dependency. |
| **10. Unified Command Center**      | [`docs/COMMAND_CENTER.md`](file:///d:/VibeSync/docs/COMMAND_CENTER.md)                                                                                                  | Central cockpit, live WebSocket telemetry stream, Metric Triad cards, and embedded Copilot console.                                   |

---

## 🎓 4. Academic & Submission Portfolio

| Document                                                                                             | Scope / Evaluation Purpose                                                                                                               |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/FINAL_PROJECT_REPORT.md`](file:///d:/VibeSync/docs/FINAL_PROJECT_REPORT.md)                   | Comprehensive B.Tech Final Project Report covering Abstract, Literature Review, Methodology, Architecture, Evaluation, and Viva Defense. |
| [`docs/RESEARCH_CONTRIBUTION.md`](file:///d:/VibeSync/docs/RESEARCH_CONTRIBUTION.md)                 | Academic research contribution, formal problem formulation, mathematical models, and comparative empirical analysis.                     |
| [`docs/VIVA_MASTER_SHEET.md`](file:///d:/VibeSync/docs/VIVA_MASTER_SHEET.md)                         | Complete oral defense master cheat-sheet containing technical defenses for external evaluators and professors.                           |
| [`docs/VIVA_PREPARATION.md`](file:///d:/VIVA_PREPARATION.md)                                         | 30+ categorized Viva Q&A scenarios covering determinism, privacy, scalability, scoring formulas, and failure modes.                      |
| [`docs/EVALUATION.md`](file:///d:/VibeSync/docs/EVALUATION.md)                                       | Empirical benchmarks (sub-millisecond AST latency, determinism verification, memory footprint, recovery latency).                        |
| [`docs/PPT_CONTENT.md`](file:///d:/VibeSync/docs/PPT_CONTENT.md)                                     | Word-for-word presentation slide deck content with speaking notes and diagram placements.                                                |
| [`docs/FINAL_DEFENSE_CLAIMS.md`](file:///d:/VibeSync/docs/FINAL_DEFENSE_CLAIMS.md)                   | Traceable verification matrix connecting academic defense claims directly to source code and tests.                                      |
| [`docs/ACADEMIC_SUBMISSION_CHECKLIST.md`](file:///d:/VibeSync/docs/ACADEMIC_SUBMISSION_CHECKLIST.md) | Final verification checklist ensuring 100% submission compliance.                                                                        |

---

## 🎬 5. Demonstration & Presentation Material

| Document                                                                       | Description                                                                                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| [`docs/SEMINAR_DEMO.md`](file:///d:/VibeSync/docs/SEMINAR_DEMO.md)             | Complete seminar demonstration script with pre-flight checklist, timed 5-minute presenter runbook, and fail-safe instructions. |
| [`docs/FINAL_DEMO_RUNBOOK.md`](file:///d:/VibeSync/docs/FINAL_DEMO_RUNBOOK.md) | Minute-by-minute execution runbook for 5-minute, 10-minute, and 15-minute viva live demonstrations.                            |
| [`docs/FINAL_DEMO_SCRIPT.md`](file:///d:/VibeSync/docs/FINAL_DEMO_SCRIPT.md)   | Word-for-word spoken presenter script with exact mouse click actions, visual cues, and recovery steps.                         |
| [`DEMO.md`](file:///d:/VibeSync/DEMO.md)                                       | Exhaustive end-to-end interactive demonstration guide across all 10 intelligence stages.                                       |

---

## 📜 6. Historical Snapshots & Architecture Decision Records (ADRs)

_These documents represent historical milestones, sprint retrospectives, and developmental checkpoints. They are preserved intact for forensic lineage._

- **Architecture Decision Records**: [`docs/adr/0001-monorepo-strategy.md`](file:///d:/VibeSync/docs/adr/0001-monorepo-strategy.md) through [`docs/adr/0012-daemon-event-pipeline.md`](file:///d:/VibeSync/docs/adr/0012-daemon-event-pipeline.md).
- **Sprint Retrospectives & Audits**:
  - [`docs/SPRINT_14_TRUTH_AUDIT.md`](file:///d:/VibeSync/docs/SPRINT_14_TRUTH_AUDIT.md): Sprint 14 forensic audit verifying claims against implementation.
  - [`docs/POST_SPRINT12_AUDIT.md`](file:///d:/VibeSync/docs/POST_SPRINT12_AUDIT.md): Post-Sprint 12 stabilization and freeze audit.
  - [`docs/FULL_SYSTEM_AUDIT.md`](file:///d:/VibeSync/docs/FULL_SYSTEM_AUDIT.md): Sprint 11 full system audit.
  - [`docs/SPRINT_12_PRODUCTIZATION.md`](file:///d:/VibeSync/docs/SPRINT_12_PRODUCTIZATION.md): Sprint 12 acceptance criteria results.
  - [`docs/known-issues/windows-asyncpg-backgroundtasks-teardown.md`](file:///d:/VibeSync/docs/known-issues/windows-asyncpg-backgroundtasks-teardown.md): Documented Windows asyncpg teardown solution.

---

## 🔑 Canonical Invariants Reference

1. **Dedicated Port Namespace**:
   - `FastAPI Backend API`: `5133` (`5133` = VIBE)
   - `React / Vite Dashboard`: `5134`
   - `Telemetry Daemon`: `5135`
   - `PostgreSQL`: `5432`
   - `Redis`: Cloud
2. **Ground Truth Invariant**: PostgreSQL is the single canonical source of truth. Zero dual state-machines or in-memory drift.
3. **Determinism Invariant**: Replaying canonical events yields an identical state ($A \equiv B$).
4. **Secret Redaction**: Raw tokens and credentials are masked to `[REDACTED]` prior to persistence and presentation.
5. **Multi-Project Isolation**: Telemetry and context for Project A are 100% isolated from Project B.
6. **Safe Project Deletion**: Removing a project deletes only VibePulse telemetry; local source code is never touched.
