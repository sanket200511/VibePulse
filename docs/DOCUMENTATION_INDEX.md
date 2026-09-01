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
│  Level 2: CURRENT / AUTHORITATIVE    docs/architecture/ARCHITECTURE.md,     │
│                                      docs/overview/PROJECT_STATUS.md,       │
│                                      SECURITY.md, CHANGELOG.md              │
│  Level 3: OPERATIONAL MANUALS        docs/development/LOCAL_DEVELOPMENT.md, │
│                                      docs/development/INSTALLATION.md,      │
│                                      docs/api/API_REFERENCE.md,             │
│                                      docs/operations/DEPLOYMENT.md          │
│  Level 4: SUBSYSTEM DEEP DIVES       docs/subsystems/**                     │
│  Level 5: ACADEMIC & DEFENSE         docs/academic/**                       │
│  Level 6: DEMONSTRATION & RUNBOOKS   docs/demos/**                          │
│  Level 7: AUDITS & HISTORICAL        docs/audits/**, docs/history/sprints/**│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📍 1. Primary Entry Points (Start Here)

| Document              | Canonical Path                                                                   | Status    | Audience | Scope / Description                                                                               |
| --------------------- | -------------------------------------------------------------------------------- | --------- | -------- | ------------------------------------------------------------------------------------------------- |
| **Root README**       | [`README.md`](file:///d:/VibeSync/README.md)                                     | `CURRENT` | All      | Executive project summary, architecture blueprint, metric triad, quickstart, and core guarantees. |
| **Master Docs Index** | [`docs/DOCUMENTATION_INDEX.md`](file:///d:/VibeSync/docs/DOCUMENTATION_INDEX.md) | `CURRENT` | All      | This document. Master inventory, classification, and sitemap of all project documents.            |
| **Docs Overview**     | [`docs/README.md`](file:///d:/VibeSync/docs/README.md)                           | `CURRENT` | All      | Quick navigational overview of the entire `docs/` tree.                                           |

---

## 🔭 2. Project Overview

| Document           | Canonical Path                                                                           | Status    | Audience             | Scope / Description                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------- | --------- | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Project Vision** | [`docs/overview/VISION.md`](file:///d:/VibeSync/docs/overview/VISION.md)                 | `CURRENT` | All                  | Strategic purpose, developer observability paradigm for AI coding, and long-term vision.                   |
| **Project Status** | [`docs/overview/PROJECT_STATUS.md`](file:///d:/VibeSync/docs/overview/PROJECT_STATUS.md) | `CURRENT` | Evaluator, Developer | Live engineering status, verified test baselines (348 backend / 130 daemon tests), and sprint completions. |
| **Current Sprint** | [`docs/overview/CURRENT_SPRINT.md`](file:///d:/VibeSync/docs/overview/CURRENT_SPRINT.md) | `CURRENT` | Evaluator, Developer | Active architecture freeze and final academic packaging state.                                             |
| **Roadmap**        | [`docs/overview/ROADMAP.md`](file:///d:/VibeSync/docs/overview/ROADMAP.md)               | `CURRENT` | Evaluator, Developer | Milestone progression (Phases 1–12 completed) and post-v1.0 horizons.                                      |
| **FAQ**            | [`docs/overview/FAQ.md`](file:///d:/VibeSync/docs/overview/FAQ.md)                       | `CURRENT` | All                  | Frequently asked questions on zero-LLM architecture, AST parsing, privacy, and determinism.                |

---

## 🏗️ 3. Architecture & System Design

| Document                    | Canonical Path                                                                                                                               | Status      | Audience             | Scope / Description                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------- | ------------------------------------------------------------------------------------------------------- |
| **System Architecture**     | [`docs/architecture/ARCHITECTURE.md`](file:///d:/VibeSync/docs/architecture/ARCHITECTURE.md)                                                 | `CURRENT`   | Architect, Developer | Comprehensive system architecture, data flow, PostgreSQL ground truth model, and intelligence pipeline. |
| **System Design**           | [`docs/architecture/SYSTEM_DESIGN.md`](file:///d:/VibeSync/docs/architecture/SYSTEM_DESIGN.md)                                               | `CURRENT`   | Architect, Developer | Operational node topology, sequence diagrams, and scalability considerations.                           |
| **Design Philosophy**       | [`docs/architecture/DESIGN.md`](file:///d:/VibeSync/docs/architecture/DESIGN.md)                                                             | `CURRENT`   | Designer, Developer  | Engineering philosophy and core UI/UX architecture principles.                                          |
| **VibePulse 2.0 Blueprint** | [`docs/architecture/VIBEPULSE_2.0_ARCHITECTURE_BLUEPRINT.md`](file:///d:/VibeSync/docs/architecture/VIBEPULSE_2.0_ARCHITECTURE_BLUEPRINT.md) | `REFERENCE` | Architect            | Deep architectural blueprint for the intelligence layers.                                               |

---

## 💻 4. Development Guides

| Document               | Canonical Path                                                                                       | Status    | Audience    | Scope / Description                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | --------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| **Engineering Guide**  | [`docs/development/ENGINEERING.md`](file:///d:/VibeSync/docs/development/ENGINEERING.md)             | `CURRENT` | Developer   | Coding standards, TypeScript/Python conventions, SOLID principles, and git workflows.                      |
| **Local Development**  | [`docs/development/LOCAL_DEVELOPMENT.md`](file:///d:/VibeSync/docs/development/LOCAL_DEVELOPMENT.md) | `CURRENT` | Developer   | Native local environment setup, dedicated port configuration (`5184`/`5183`/`5185`), and supervisor usage. |
| **Installation Guide** | [`docs/development/INSTALLATION.md`](file:///d:/VibeSync/docs/development/INSTALLATION.md)           | `CURRENT` | Developer   | Prerequisites (Node 22, Python 3.12, PostgreSQL 16, pnpm 9), dependencies, and migrations.                 |
| **Contributing Guide** | [`CONTRIBUTING.md`](file:///d:/VibeSync/CONTRIBUTING.md)                                             | `CURRENT` | Contributor | Open-source contribution rules, pull request guidelines, and issue reporting.                              |

---

## ⚙️ 5. Operations & Security

| Document             | Canonical Path                                                                                                                                       | Status      | Audience          | Scope / Description                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------- | ---------------------------------------------------------------------------------------------------- |
| **Deployment Guide** | [`docs/operations/DEPLOYMENT.md`](file:///d:/VibeSync/docs/operations/DEPLOYMENT.md)                                                                 | `CURRENT`   | DevOps, Developer | Docker Compose containerized deployment specification and environment configs.                       |
| **Security Policy**  | [`SECURITY.md`](file:///d:/VibeSync/SECURITY.md)                                                                                                     | `CURRENT`   | All               | Privacy guarantees, AST secret redaction policy (`[REDACTED]`), tenant isolation, and safe deletion. |
| **Known Issues**     | [`docs/known-issues/windows-asyncpg-backgroundtasks-teardown.md`](file:///d:/VibeSync/docs/known-issues/windows-asyncpg-backgroundtasks-teardown.md) | `REFERENCE` | Developer         | Documented Windows asyncpg task teardown solution.                                                   |

---

## 🔌 6. API Reference

| Document          | Canonical Path                                                               | Status    | Audience  | Scope / Description                                                                                             |
| ----------------- | ---------------------------------------------------------------------------- | --------- | --------- | --------------------------------------------------------------------------------------------------------------- |
| **API Reference** | [`docs/api/API_REFERENCE.md`](file:///d:/VibeSync/docs/api/API_REFERENCE.md) | `CURRENT` | Developer | REST & WebSocket endpoint contracts across Projects, Sessions, Events, Health, Investigations, KG, and Copilot. |

---

## 🧠 7. Subsystems (Canonical Intelligence Pipeline)

The canonical pipeline is:
$$\text{OBSERVE} \to \text{DETECT} \to \text{UNDERSTAND} \to \text{INVESTIGATE} \to \text{RESOLVE} \to \text{LEARN} \to \text{PREDICT} \to \text{ASK} \to \text{ACT} \to \text{MEMORY}$$

| Subsystem                   | Canonical Path                                                                                                                                                 | Status      | Scope / Description                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------- |
| **Observation**             | [`docs/subsystems/observation/LIVE_OBSERVABILITY.md`](file:///d:/VibeSync/docs/subsystems/observation/LIVE_OBSERVABILITY.md)                                   | `CURRENT`   | Filesystem watcher, Chokidar debouncing, gate control, and event ingestion.                 |
| **Project Context Memory**  | [`docs/subsystems/project-context/PROJECT_CONTEXT.md`](file:///d:/VibeSync/docs/subsystems/project-context/PROJECT_CONTEXT.md)                                 | `CURRENT`   | Durable context memory, tech stack detectors, and portable AI context export.               |
| **Project Intelligence**    | [`docs/subsystems/project-intelligence/PROJECT_INTELLIGENCE.md`](file:///d:/VibeSync/docs/subsystems/project-intelligence/PROJECT_INTELLIGENCE.md)             | `CURRENT`   | Multi-session aggregation, developer activity timelines, and project read models.           |
| **Engineering DNA**         | [`docs/subsystems/engineering-dna/ENGINEERING_DNA.md`](file:///d:/VibeSync/docs/subsystems/engineering-dna/ENGINEERING_DNA.md)                                 | `CURRENT`   | Structural code evolution and AST-based syntactic extraction.                               |
| **Security Intelligence**   | [`docs/subsystems/security-intelligence/SECURITY_INTELLIGENCE.md`](file:///d:/VibeSync/docs/subsystems/security-intelligence/SECURITY_INTELLIGENCE.md)         | `CURRENT`   | AST static rules (`SEC001`, `DEBUG_TRUE`), secret masking, and risk scoring.                |
| **Scoring Reference**       | [`docs/subsystems/security-intelligence/SCORING_REFERENCE.md`](file:///d:/VibeSync/docs/subsystems/security-intelligence/SCORING_REFERENCE.md)                 | `REFERENCE` | Exact mathematical formulas for weights, deductions, and health metrics.                    |
| **Investigation Engine**    | [`docs/subsystems/investigation/INVESTIGATION_ENGINE_3.md`](file:///d:/VibeSync/docs/subsystems/investigation/INVESTIGATION_ENGINE_3.md)                       | `CURRENT`   | Causal DAG reconstruction, incident prioritization, and score decomposition.                |
| **Evidence Intelligence**   | [`docs/subsystems/investigation/EVIDENCE_INTELLIGENCE.md`](file:///d:/VibeSync/docs/subsystems/investigation/EVIDENCE_INTELLIGENCE.md)                         | `CURRENT`   | Universal Evidence Inspector, node graph generation, and point breakdown.                   |
| **Resolution Intelligence** | [`docs/subsystems/resolution/INCIDENT_RESOLUTION.md`](file:///d:/VibeSync/docs/subsystems/resolution/INCIDENT_RESOLUTION.md)                                   | `CURRENT`   | Review lifecycle workflow (`OPEN` $\to$ `RESOLVED`) and immutable PostgreSQL audit history. |
| **Predictive Intelligence** | [`docs/subsystems/predictive-intelligence/PREDICTIVE_INTELLIGENCE.md`](file:///d:/VibeSync/docs/subsystems/predictive-intelligence/PREDICTIVE_INTELLIGENCE.md) | `CURRENT`   | Empirical code churn acceleration, directory hotspots, and regression forecasts.            |
| **Unified Project Health**  | [`docs/subsystems/unified-health/PROJECT_HEALTH.md`](file:///d:/VibeSync/docs/subsystems/unified-health/PROJECT_HEALTH.md)                                     | `CURRENT`   | 5-dimension composite health score ($0\dots 100$) and Metric Triad cards.                   |
| **Knowledge Graph**         | [`docs/subsystems/knowledge-graph/KNOWLEDGE_GRAPH.md`](file:///d:/VibeSync/docs/subsystems/knowledge-graph/KNOWLEDGE_GRAPH.md)                                 | `CURRENT`   | Semantic multi-entity graph traversal (`CONTAINS`, `AFFECTS`, `RESOLVED_BY`).               |
| **KG Reference**            | [`docs/subsystems/knowledge-graph/KNOWLEDGE_GRAPH_REFERENCE.md`](file:///d:/VibeSync/docs/subsystems/knowledge-graph/KNOWLEDGE_GRAPH_REFERENCE.md)             | `REFERENCE` | Graph schema, node definitions, and edge taxonomies.                                        |
| **AI Copilot**              | [`docs/subsystems/copilot/COPILOT.md`](file:///d:/VibeSync/docs/subsystems/copilot/COPILOT.md)                                                                 | `CURRENT`   | 16 canonical query families, tri-state provenance, Answerability Gate (Zero LLM).           |
| **Command Center**          | [`docs/subsystems/copilot/COMMAND_CENTER.md`](file:///d:/VibeSync/docs/subsystems/copilot/COMMAND_CENTER.md)                                                   | `CURRENT`   | Unified engineering cockpit, live WebSocket telemetry, and embedded Copilot mini-console.   |

---

## 🎬 8. Demonstrations & Presentation Materials

| Document                 | Canonical Path                                                                             | Status    | Audience  | Scope / Description                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------ | --------- | --------- | -------------------------------------------------------------------------------------------------------------- |
| **Seminar Demo Runbook** | [`docs/demos/SEMINAR_DEMO.md`](file:///d:/VibeSync/docs/demos/SEMINAR_DEMO.md)             | `CURRENT` | Presenter | Complete seminar demonstration script with pre-flight checklist, timed presenter runbook, and fail-safe steps. |
| **Final Demo Runbook**   | [`docs/demos/FINAL_DEMO_RUNBOOK.md`](file:///d:/VibeSync/docs/demos/FINAL_DEMO_RUNBOOK.md) | `CURRENT` | Presenter | Minute-by-minute execution runbook for 5-minute, 10-minute, and 15-minute viva demonstrations.                 |
| **Final Demo Script**    | [`docs/demos/FINAL_DEMO_SCRIPT.md`](file:///d:/VibeSync/docs/demos/FINAL_DEMO_SCRIPT.md)   | `CURRENT` | Presenter | Word-for-word spoken presenter script with exact mouse click actions, visual cues, and recovery steps.         |
| **General Demo Guide**   | [`docs/demos/DEMO.md`](file:///d:/VibeSync/docs/demos/DEMO.md)                             | `CURRENT` | Presenter | Exhaustive end-to-end interactive demonstration guide across all 10 intelligence stages.                       |
| **Presentation Deck**    | [`docs/demos/PPT_CONTENT.md`](file:///d:/VibeSync/docs/demos/PPT_CONTENT.md)               | `CURRENT` | Presenter | Word-for-word presentation slide deck content with speaking notes and diagram placements.                      |

---

## 🎓 9. Academic & Submission Portfolio

| Document                  | Canonical Path                                                                                                         | Status    | Audience              | Scope / Description                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Final Thesis Report**   | [`docs/academic/FINAL_PROJECT_REPORT.md`](file:///d:/VibeSync/docs/academic/FINAL_PROJECT_REPORT.md)                   | `CURRENT` | Examiner, Professor   | Comprehensive B.Tech Final Project Report covering Abstract, Literature Review, Methodology, Architecture, Evaluation, and Viva Defense. |
| **Viva Master Sheet**     | [`docs/academic/VIVA_MASTER_SHEET.md`](file:///d:/VibeSync/docs/academic/VIVA_MASTER_SHEET.md)                         | `CURRENT` | Examiner, Presenter   | Complete oral defense master cheat-sheet containing technical defenses for external evaluators and professors.                           |
| **Viva Preparation**      | [`docs/academic/VIVA_PREPARATION.md`](file:///d:/VibeSync/docs/academic/VIVA_PREPARATION.md)                           | `CURRENT` | Examiner, Presenter   | 30+ categorized Viva Q&A scenarios covering determinism, privacy, scalability, scoring formulas, and failure modes.                      |
| **Research Contribution** | [`docs/academic/RESEARCH_CONTRIBUTION.md`](file:///d:/VibeSync/docs/academic/RESEARCH_CONTRIBUTION.md)                 | `CURRENT` | Researcher            | Formal problem formulation, mathematical models, and comparative empirical analysis.                                                     |
| **Empirical Evaluation**  | [`docs/academic/EVALUATION.md`](file:///d:/VibeSync/docs/academic/EVALUATION.md)                                       | `CURRENT` | Evaluator, Researcher | Empirical benchmarks (sub-millisecond AST latency, determinism verification, memory footprint, recovery latency).                        |
| **Defense Claims Matrix** | [`docs/academic/FINAL_DEFENSE_CLAIMS.md`](file:///d:/VibeSync/docs/academic/FINAL_DEFENSE_CLAIMS.md)                   | `CURRENT` | Examiner              | Traceable verification matrix connecting academic defense claims directly to source code and tests.                                      |
| **Submission Checklist**  | [`docs/academic/ACADEMIC_SUBMISSION_CHECKLIST.md`](file:///d:/VibeSync/docs/academic/ACADEMIC_SUBMISSION_CHECKLIST.md) | `CURRENT` | Examiner              | Final verification checklist ensuring 100% submission compliance.                                                                        |

---

## 🔍 10. System Audits & Verification

| Document | Canonical Path | Status | Audience | Scope / Description |
| **Demo Mode Audit** | [`docs/audits/DEMO_MODE_AUDIT.md`](file:///d:/VibeSync/docs/audits/DEMO_MODE_AUDIT.md) | `CURRENT` | Evaluator, Presenter | Comprehensive audit of demo entry points, project lifecycle, and 10-stage execution truth. |
| **Demo Mode Final Audit** | [`docs/audits/DEMO_MODE_FINAL_AUDIT.md`](file:///d:/VibeSync/docs/audits/DEMO_MODE_FINAL_AUDIT.md) | `CURRENT` | Evaluator, Presenter | Authoritative comparison of old vs new demo mode, safety proofs, and verification matrices. |
| **Final Release Acceptance** | [`docs/audits/FINAL_RELEASE_ACCEPTANCE.md`](file:///d:/VibeSync/docs/audits/FINAL_RELEASE_ACCEPTANCE.md) | `CURRENT` | Evaluator, Developer | Final release gate acceptance report, truth reconciliation, and verification matrix. |
| **Whole Platform Forensic Audit** | [`docs/audits/WHOLE_PLATFORM_FORENSIC_AUDIT.md`](file:///d:/VibeSync/docs/audits/WHOLE_PLATFORM_FORENSIC_AUDIT.md) | `CURRENT` | Evaluator, Developer | Comprehensive whole-platform bug audit, schema validation, and runtime hardening report. |
| **Final Project Status** | [`docs/audits/FINAL_PROJECT_STATUS.md`](file:///d:/VibeSync/docs/audits/FINAL_PROJECT_STATUS.md) | `CURRENT` | Evaluator | Executive status audit across all 10 intelligence stages and 348/130 verified tests. |
| **Full System Audit** | [`docs/audits/FULL_SYSTEM_AUDIT.md`](file:///d:/VibeSync/docs/audits/FULL_SYSTEM_AUDIT.md) | `HISTORICAL` | Evaluator | Post-Sprint-4 system integration and reliability audit. |
| **Whole System Audit** | [`docs/audits/WHOLE_SYSTEM_READINESS_AUDIT.md`](file:///d:/VibeSync/docs/audits/WHOLE_SYSTEM_READINESS_AUDIT.md) | `HISTORICAL` | Evaluator | Whole-system presentation readiness review. |
| **Post-Sprint 12 Audit** | [`docs/audits/POST_SPRINT12_AUDIT.md`](file:///d:/VibeSync/docs/audits/POST_SPRINT12_AUDIT.md) | `HISTORICAL` | Evaluator | Post-Sprint 12 stabilization and freeze audit. |
| **Release Audit** | [`docs/audits/GITHUB_RELEASE_AUDIT.md`](file:///d:/VibeSync/docs/audits/GITHUB_RELEASE_AUDIT.md) | `HISTORICAL` | Developer | Release hygiene and repository packaging review. |

---

## 📜 11. Architecture Decision Records (ADRs) & Historical Sprints

### Architecture Decision Records (`docs/adr/`)

- [`0001-monorepo-strategy.md`](file:///d:/VibeSync/docs/adr/0001-monorepo-strategy.md) through [`0012-daemon-event-pipeline.md`](file:///d:/VibeSync/docs/adr/0012-daemon-event-pipeline.md)

### Historical Sprint Records (`docs/history/sprints/`)

- **Sprint 6**: [`docs/history/sprints/sprint-06/PREDICTIVE_INTELLIGENCE_PLAN.md`](file:///d:/VibeSync/docs/history/sprints/sprint-06/PREDICTIVE_INTELLIGENCE_PLAN.md)
- **Sprint 7**: [`docs/history/sprints/sprint-07/SPRINT_7_UNIFIED_HEALTH_PLAN.md`](file:///d:/VibeSync/docs/history/sprints/sprint-07/SPRINT_7_UNIFIED_HEALTH_PLAN.md)
- **Sprint 10**: [`docs/history/sprints/sprint-10/KNOWLEDGE_GRAPH_PLAN.md`](file:///d:/VibeSync/docs/history/sprints/sprint-10/KNOWLEDGE_GRAPH_PLAN.md)
- **Sprint 11**: [`docs/history/sprints/sprint-11/COPILOT_PLAN.md`](file:///d:/VibeSync/docs/history/sprints/sprint-11/COPILOT_PLAN.md)
- **Sprint 12**: [`docs/history/sprints/sprint-12/SPRINT_12_PRODUCTIZATION.md`](file:///d:/VibeSync/docs/history/sprints/sprint-12/SPRINT_12_PRODUCTIZATION.md), [`SPRINT_12_PRODUCTIZATION_PLAN.md`](file:///d:/VibeSync/docs/history/sprints/sprint-12/SPRINT_12_PRODUCTIZATION_PLAN.md)
- **Sprint 13**: [`docs/history/sprints/sprint-13/SPRINT_13_FINAL_READINESS_PLAN.md`](file:///d:/VibeSync/docs/history/sprints/sprint-13/SPRINT_13_FINAL_READINESS_PLAN.md)
- **Sprint 14**: [`docs/history/sprints/sprint-14/SPRINT_14_TRUTH_AUDIT.md`](file:///d:/VibeSync/docs/history/sprints/sprint-14/SPRINT_14_TRUTH_AUDIT.md)

---

## 🔑 Canonical Invariants Reference

1. **Dedicated Port Namespace**:
   - `FastAPI Backend API`: `5184`
   - `React / Vite Dashboard`: `5183`
   - `Telemetry Daemon`: `5185`
   - `PostgreSQL`: `5432`
   - `Redis`: Cloud
2. **Ground Truth Invariant**: PostgreSQL is the single canonical source of truth. Zero dual state-machines or in-memory drift.
3. **Determinism Invariant**: Replaying canonical events yields an identical state ($A \equiv B$).
4. **Secret Redaction**: Raw tokens and credentials are masked to `[REDACTED]` prior to persistence and presentation.
5. **Multi-Project Isolation**: Telemetry and context for Project A are 100% isolated from Project B.
6. **Safe Project Deletion**: Removing a project deletes only VibePulse telemetry; local source code is never touched.
