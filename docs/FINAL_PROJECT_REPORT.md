# VibePulse: An Event-Driven Deterministic Architecture for Continuous Engineering Intelligence and Grounded Copilot Orchestration

**Final Year Project Report / Technical Dissertation**
**Degree**: Bachelor of Technology in Computer Science & Engineering
**System Status**: ARCHITECTURE FROZEN & VERIFIED
**Canonical Ground Truth**: PostgreSQL Historical Telemetry ($A \equiv B$)

---

## Abstract

Modern software engineering organizations suffer from fragmented, out-of-band visibility into the software creation process. Version control systems record curated milestone commits, while static analysis tools typically execute in delayed CI/CD pipelines. This dissertation presents **VibePulse**, a deterministic, event-driven engineering intelligence architecture that captures sub-second local filesystem telemetry and derives multi-dimensional project health composites, static AST security findings, causal incident DAGs, predictive code churn forecasts, and semantic knowledge graphs directly from relational database ground truth. Furthermore, VibePulse implements an AI Engineering Copilot orchestration layer over 16 canonical query families with tri-state provenance (`[OBSERVED]`, `[INFERRED]`, `[UNKNOWN]`) and an Answerability Gate, rejecting out-of-scope queries without reliance on third-party generative LLMs. Empirical evaluation across 347 backend tests, 130 daemon tests, and isolated repository benchmarks demonstrates sub-115ms local query latencies and 100% deterministic reconstructibility ($A \equiv B$).

---

## 1. Introduction

Software development is inherently iterative, characterized by rapid local prototyping, configuration experiments, debugging cycles, and transient code states. However, traditional engineering intelligence tools only observe software at high-latency integration boundaries (e.g., Git push or CI/CD build triggers). As a result, transient security exposures (such as accidentally saved API keys or debug flags) and localized architectural churn are lost before peer review.

VibePulse bridges this visibility gap by introducing continuous local observation coupled with deterministic relational state projection.

---

## 2. Problem Statement

1. **Milestone Blindness**: Version control systems capture finalized states, ignoring the transient evolution and developer churn that precede a commit.
2. **Delayed Risk Detection**: Security vulnerabilities and hardcoded secrets are often detected only after reaching remote CI runners or production environments.
3. **Generative LLM Hallucination**: Off-the-shelf generative AI assistants frequently fabricate architectural relationships, invent non-existent APIs, and lack ground truth constraints.
4. **Context Fragmentation**: Triage notes, incident root causes, and architectural changes reside in disparate communication silos (e.g., Slack, Jira) disconnected from the underlying code churn.

---

## 3. Motivation & Objectives

The primary motivation behind VibePulse is to construct a transparent, explainable, and deterministic engineering intelligence system that guarantees:

- **Continuous Local Telemetry**: Automatic capture of filesystem events without manual developer intervention.
- **Deterministic Metrics**: Mathematical health scoring ($0 \dots 100$) where identical telemetry inputs always yield identical analytical projections ($A \equiv B$).
- **Evidence-Grounded Interaction**: An AI Copilot interface that explicitly communicates fact provenance (`[OBSERVED]`, `[INFERRED]`, `[UNKNOWN]`) and redacts sensitive credentials to `[REDACTED]`.
- **Closed-Loop Feedback**: Demonstrable recovery where source code remediation immediately updates health projections and resolves active incidents.

---

## 4. System Architecture

VibePulse employs a decoupled 3-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Tier                           │
│   Unified Engineering Command Center (React 18 / Vite / TS) │
│   - Live Telemetry Stream  - Metric Triad  - Copilot Console│
└──────────────────────────────▲──────────────────────────────┘
                               │ WebSocket / REST
┌──────────────────────────────▼──────────────────────────────┐
│                    Intelligence Core Tier                   │
│   FastAPI (Python 3.12) / Static AST Analyzers (Tree-Sitter)│
│   - Unified Health (5D)    - Predictive Churn Hotspots      │
│   - Causal Investigation   - 16-Intent Copilot Synthesizer  │
│   - Knowledge Graph Engine - Project Context Exporter       │
└──────────────────────────────▲──────────────────────────────┘
                               │ SQL (SQLAlchemy / Asyncpg)
┌──────────────────────────────▼──────────────────────────────┐
│                   Storage & Ground Truth                    │
│   PostgreSQL 16 (8 Alembic Migrations)                      │
│   - development_events     - sessions       - event_analyses│
│   - incident_review_states - project_contexts - projects    │
└──────────────────────────────▲──────────────────────────────┘
                               │ HTTP POST /events
┌──────────────────────────────┴──────────────────────────────┐
│                      Observation Tier                       │
│   VibePulse Node.js Daemon (TypeScript / Chokidar)          │
│   - Debounced Watcher      - SHA-256 Hasher - HTTP Publisher│
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Canonical Intelligence Pipeline

Every engineering interaction follows the 10-stage canonical lifecycle:

$$\text{OBSERVE} \longrightarrow \text{DETECT} \longrightarrow \text{UNDERSTAND} \longrightarrow \text{INVESTIGATE} \longrightarrow \text{RESOLVE} \longrightarrow \text{LEARN} \longrightarrow \text{PREDICT} \longrightarrow \text{ASK} \longrightarrow \text{ACT} \longrightarrow \text{MEMORY}$$

1. **OBSERVE**: Watcher captures file modifications and groups events into contiguous sessions.
2. **DETECT**: Static AST engine extracts rule matches (`SEC001`, `DEBUG_TRUE`).
3. **UNDERSTAND**: Security Risk Score ($R_{\text{sec}}$) is calculated and mapped to Health penalties.
4. **INVESTIGATE**: Correlated incidents reconstruct causal Directed Acyclic Graphs (DAGs).
5. **RESOLVE**: Engineer applies code fix; triage transitions incident status (`OPEN` $\to$ `RESOLVED`).
6. **LEARN**: Resolution notes and reviewer identity are permanently logged in `incident_review_history`.
7. **PREDICT**: Time-series churn velocity and hotspot heuristics forecast emerging risk signals.
8. **ASK**: Copilot resolves natural engineering queries across 16 canonical domains.
9. **ACT**: Closed-loop recomputation: telemetry from remediation restores Unified Health.
10. **MEMORY**: Semantic Knowledge Graph materializes relationships and exports `PROJECT_CONTEXT.md` (22 sections).

---

## 6. Mathematical Formulations

### Unified Project Health Model ($0 \dots 100$)

$$\text{Overall Health} = \text{round}\left( 0.25 S_{\text{sec}} + 0.20 S_{\text{eng}} + 0.20 S_{\text{inc}} + 0.15 S_{\text{res}} + 0.20 S_{\text{pred}} \right)$$

1. **Security Health ($S_{\text{sec}}$, Weight $= 0.25$)**:
   $$S_{\text{sec}} = \max\left(0, \min(100, 100 - R_{\text{sec}})\right)$$
   Where $R_{\text{sec}}$ is the sum of risk contribution points from active unmitigated AST findings.
2. **Engineering Stability ($S_{\text{eng}}$, Weight $= 0.20$)**:
   $$S_{\text{eng}} = \max\left(40, \min(100, 100 - \text{Penalty}_{\text{burst}} - \text{Penalty}_{\text{fragmentation}})\right)$$
   - $\text{Penalty}_{\text{burst}} = 10$ if recent events in the last 3 sessions $> 50$, else $0$.
   - $\text{Penalty}_{\text{fragmentation}} = 5$ if active languages $> 3$, else $0$.
3. **Incident Health ($S_{\text{inc}}$, Weight $= 0.20$)**:
   $$S_{\text{inc}} = \max\left(0, \min(100, 100 - (30 N_{\text{crit}} + 15 N_{\text{high}} + 10 N_{\text{open}}))\right)$$
4. **Resolution Health ($S_{\text{res}}$, Weight $= 0.15$)**:
   $$S_{\text{res}} = \max\left(0, \min(100, \text{int}(0.6 R_{\text{res}} + 0.4 (100 - P_{\text{reg}})))\right)$$
   Where $R_{\text{res}} = \frac{N_{\text{resolved}}}{N_{\text{open}} + N_{\text{resolved}}} \times 100$ and $P_{\text{reg}} = 35$ if a resolution regression signal is active.
5. **Predictive Risk Health ($S_{\text{pred}}$, Weight $= 0.20$)**:
   $$S_{\text{pred}} = \max\left(0, \min(100, 100 - \text{int}(0.7 F_{\max} + \min(30, 10 N_{\text{hotspots}})))\right)$$

---

## 7. Algorithms & Pseudocode

### Algorithm 1: Filesystem Telemetry Capture (Daemon)

```
Input: File system modification event e, Configuration cfg
Output: Published DevelopmentEvent payload

1: function OnFileEvent(e):
2:    if e.path matches cfg.ignoredPatterns then
3:        return
4:    end if
5:    debouncedEvent ← Debounce(e, cfg.debounceMs)
6:    diffContent ← ExtractUnifiedDiff(debouncedEvent.path)
7:    shaHash ← ComputeSHA256(debouncedEvent.path)
8:    payload ← ConstructEvent(debouncedEvent, diffContent, shaHash, currentSessionId)
9:    HttpPublisher.PublishWithRetry(payload, cfg.retryMaxNormal, cfg.retryBackoffBaseMs)
10: end function
```

### Algorithm 2: Deterministic Copilot Query Processing & Answerability Gate

```
Input: Natural Query string Q, Project ID P
Output: Structured CopilotResponse R

1: function ProcessCopilotQuery(Q, P):
2:    entities ← ExtractEntities(Q)   // file paths, rule IDs, subsystems
3:    if MatchesOutOfScopeDomain(Q) then
4:        return CopilotResponse(
5:            answerable = false,
6:            intent = "UNKNOWN",
7:            summary = "Query is outside observed engineering telemetry domain.",
8:            facts = [Fact(claim = "Out of scope", provenance = "UNKNOWN")]
9:        )
10:   end if
11:   intent ← ClassifyIntent(Q)       // 16 canonical query families
12:   domainData ← RetrieveDomainTelemetry(P, intent, entities)
13:   facts ← SynthesizeProvenanceFacts(domainData) // Tag [OBSERVED], [INFERRED], [UNKNOWN]
14:   cleanFacts ← MaskSecrets(facts)                // Strict [REDACTED] masking
15:   narrative ← RenderDeterministicTemplate(intent, domainData, cleanFacts)
16:   return CopilotResponse(answerable = true, intent = intent, summary = narrative, facts = cleanFacts)
17: end function
```

---

## 8. Empirical Evaluation & Results

The system was benchmarked under local development workstation conditions against a local PostgreSQL 16 instance.

### Test Pyramid Summary

| Test Tier                     | Framework                      | Total Tests     | Pass Rate            |
| ----------------------------- | ------------------------------ | --------------- | -------------------- |
| **Backend Intelligence Core** | `pytest` / `pytest-asyncio`    | **347**         | **100% (347 / 347)** |
| **Daemon Observation Suite**  | `vitest`                       | **130**         | **100% (130 / 130)** |
| **Workspace Typecheck**       | `tsc` + `pyright` (5 packages) | **5 packages**  | **100% (0 errors)**  |
| **Workspace Linting**         | `eslint` + `ruff` (5 packages) | **5 packages**  | **100% (0 errors)**  |
| **Sprint 12 E2E Acceptance**  | Node.js E2E Runner             | **14 criteria** | **100% (14 / 14)**   |
| **Final System Demo Runner**  | `scripts/final-demo.mjs`       | **10 stages**   | **100% (10 / 10)**   |

### Local Latency Benchmarks

| Operation                                                                 | Measured Mean Latency | Target SLA        |
| ------------------------------------------------------------------------- | --------------------- | ----------------- |
| **Project Registration** (`POST /api/projects`)                           | **12.62 ms**          | $< 500\text{ ms}$ |
| **Event Ingestion & AST Analysis** (`POST /events`)                       | **14.05 ms**          | $< 500\text{ ms}$ |
| **Unified Health Calculation** (`GET /api/projects/:id/health`)           | **77.18 ms**          | $< 500\text{ ms}$ |
| **Security Intelligence Projection** (`GET /api/projects/:id/security`)   | **2.64 ms**           | $< 500\text{ ms}$ |
| **Predictive Risk Projection** (`GET /api/projects/:id/predictions`)      | **9.08 ms**           | $< 500\text{ ms}$ |
| **Knowledge Graph Traversal** (`GET /api/projects/:id/knowledge-graph`)   | **17.55 ms**          | $< 500\text{ ms}$ |
| **Copilot Query Synthesis** (`POST /api/projects/:id/copilot/query`)      | **62.87 ms**          | $< 500\text{ ms}$ |
| **Full Context Markdown Export** (`GET /api/projects/:id/context/export`) | **111.65 ms**         | $< 500\text{ ms}$ |

---

## 9. Limitations

1. **Local Workstation Scope**: Observation is currently bounded to local filesystem activity and static AST rules; remote CI/CD runners, production container metrics, and external cloud infrastructure remain outside observation boundaries (`[UNKNOWN]`).
2. **Network Resilience**: In case of extended API downtime exceeding the daemon's configured retry limit (`retryMaxNormal`), event publishing logs an error rather than maintaining an unbounded offline disk queue.
3. **AST Static Rule Coverage**: Static analysis targets high-confidence syntax patterns (`SEC001`, `DEBUG_TRUE`) without full dynamic symbolic execution.

---

## 10. Conclusion

VibePulse demonstrates that continuous, sub-second development telemetry can be harnessed to deliver deterministic, explainable, and evidence-grounded engineering intelligence. By relying on PostgreSQL historical events as the single ground truth and pairing deterministic intent classification with strict secret redaction and tri-state provenance, VibePulse eliminates the hallucination and credential leakage risks typical of non-deterministic LLM tools.
