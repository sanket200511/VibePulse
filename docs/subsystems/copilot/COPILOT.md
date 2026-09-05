# AI Engineering Copilot Foundation — Architecture & Query Engine

## 1. Overview & Core Mission

**DepRadar Sprint 11** establishes the **AI Engineering Copilot Foundation**.

The core mission of the AI Copilot is to answer the fundamental human engineering question:

> **"Ask DepRadar anything about this codebase."**

Examples:

- _"Why is this project unhealthy?"_
- _"What should I fix first?"_
- _"Why is auth.py risky?"_
- _"Why was this incident created?"_
- _"What might go wrong next?"_
- _"What is connected to settings.py?"_
- _"What does DepRadar know about this project?"_

---

## 2. Strict Architectural Invariants

1. **PostgreSQL Telemetry is the ONLY Canonical Ground Truth**:
   - The Copilot is an **orchestration, retrieval, and synthesis layer**.
   - It **NEVER** invents or simulates facts.
   - It reuses existing canonical intelligence layers:
     - Security Intelligence 2.0 (AST Findings & Posture)
     - Investigation Engine 3.0 (Correlated Incidents & Replays)
     - Incident Collaboration & Resolution Intelligence (Triage decisions)
     - Predictive Engineering Intelligence (Forecast Signals & Drift)
     - Unified Project Health (5-dimension mathematical decomposition)
     - Engineering Knowledge Graph & Project Memory 2.0 (Entities & Relationships)
     - Trust & Evidence Intelligence (Universal explainability chains)

2. **Explicit Tri-State Provenance Badging**:
   - Every single fact returned by the Copilot is tagged with one of three explicit provenance levels:
     - `[OBSERVED]`: Directly recorded in PostgreSQL historical telemetry or explicit human decisions (e.g. raw git commits, AST findings, review transitions).
     - `[INFERRED]`: Deterministically computed from observed telemetry by canonical rules/algorithms (e.g. health score, priority ranking, risk contribution, predictive forecast).
     - `[UNKNOWN]`: Explicit observation boundary or uncaptured domain (e.g. unobserved CI/CD pipelines, live production secrets, sub-baseline statistical sample size).

3. **Answerability Gate (Zero Hallucination)**:
   - If a user query is ungrounded, out-of-scope, or underspecified (e.g. _"Who is the CEO of Google?"_ or querying an unobserved file), the Copilot sets `answerable: false`, assigns `evidence_strength: "INSUFFICIENT"`, and transparently explains what is known vs. unknown.

4. **Secret Safety by Design**:
   - All secret tokens, API keys, and credentials matching security patterns (e.g., `VIBEPULSE_SPRINT11_SECRET_2026`, `sk_live_*`, `ghp_*`, `AKIA*`) are masked to `[REDACTED]` before synthesis and display.

5. **Multi-Project Isolation & Reconstructibility**:
   - Telemetry from Project A never leaks into Project B.
   - Querying the Copilot consecutively yields mathematically identical evidence context packages ($A \equiv B$).

---

## 3. Canonical Intent Taxonomy (12 Intents)

| Intent                 | Triggers & Keywords                                                            | Primary Canonical Source                                         |
| :--------------------- | :----------------------------------------------------------------------------- | :--------------------------------------------------------------- |
| `PROJECT_HEALTH`       | _"Why is this project unhealthy?", "What should I fix first?", "top priority"_ | `get_or_create_unified_project_health`, `get_project_priorities` |
| `SECURITY`             | _"What security issues keep recurring?", "unmitigated findings", "secrets"_    | `compute_security_intelligence`                                  |
| `INCIDENT`             | _"Why was this incident created?", "correlated incidents"_                     | `IncidentReviewState`, `compute_security_intelligence`           |
| `FILE`                 | _"What happened to auth.py?", "status of settings.py"_                         | `get_file_intelligence`, `DevelopmentEvent`                      |
| `SUBSYSTEM`            | _"Which subsystem is under pressure?", "Authentication health"_                | `get_subsystem_intelligence`, `ProjectKnowledgeGraph`            |
| `PREDICTION`           | _"What might go wrong next?", "likely failure hotspots"_                       | `get_or_create_predictive_intelligence`                          |
| `RESOLUTION`           | _"What was resolved recently?", "triage audit history"_                        | `IncidentReviewHistory`                                          |
| `KNOWLEDGE_GRAPH`      | _"What is connected to auth.py?", "graph dependencies"_                        | `get_or_create_knowledge_graph`                                  |
| `ENGINEERING_ACTIVITY` | _"What changed recently?", "recent sessions"_                                  | `DevelopmentEvent`, `Session`                                    |
| `EVIDENCE`             | _"Why does DepRadar believe this?", "show evidence"_                           | `explain_entity`                                                 |
| `PROJECT_OVERVIEW`     | _"What does DepRadar know about this project?"_                                | `get_or_create_project_context`                                  |
| `UNKNOWN`              | Out-of-scope or ungrounded questions                                           | _Answerability Gate: `answerable: false`_                        |

---

## 4. REST API Reference

### 1. `POST /api/projects/{project_id}/copilot/query`

Executes a natural engineering query against canonical intelligence.

**Request Body**:

```json
{
  "query": "What should I fix first?",
  "include_raw_context": true
}
```

**Response**:

```json
{
  "query": "What should I fix first?",
  "intent": "PROJECT_HEALTH",
  "answerable": true,
  "answerability_reason": "Query is fully grounded in PostgreSQL historical telemetry.",
  "evidence_strength": "STRONG",
  "summary": "Project 'Nexus Gateway' has an Overall Health Score of 83/100 (HEALTHY, status: READY). Your highest urgency action is Priority #1 (CRITICAL): Remediate hardcoded secret in auth.py.",
  "observed": [
    {
      "statement": "Telemetry observation contains 18 events across 12 semantic entities.",
      "provenance": "OBSERVED",
      "category": "ACTIVITY",
      "source_reference": "events_count:18"
    }
  ],
  "inferred": [
    {
      "statement": "Overall Project Health Score is 83/100 (HEALTHY, status: READY).",
      "provenance": "INFERRED",
      "category": "HEALTH",
      "source_reference": "health:83"
    }
  ],
  "unknown": [
    {
      "statement": "Deployment status to production or staging environments is not captured by local telemetry.",
      "provenance": "UNKNOWN",
      "category": "ENVIRONMENT",
      "source_reference": "out_of_band"
    }
  ],
  "recommendations": [
    {
      "title": "Priority #1: Remediate hardcoded secret",
      "explanation": "Move sensitive token to environment variable.",
      "category": "SECURITY",
      "priority": "CRITICAL",
      "action_type": "REMEDIATE_SECURITY",
      "target_entity": "src/auth/jwt_service.py",
      "deep_link_url": "/projects/.../investigate"
    }
  ],
  "evidence": [{ "id": "SEC001" }],
  "related_entities": [
    {
      "entity_id": "finding-123",
      "entity_type": "finding",
      "label": "SEC001: Hardcoded secret detected...",
      "subsystem": "src/auth/jwt_service.py",
      "url": "/projects/.../investigate"
    }
  ],
  "next_actions": [
    { "label": "Engineering Command Center", "url": "/projects/.../command-center" },
    { "label": "Knowledge Graph", "url": "/projects/.../knowledge-graph" }
  ],
  "generated_at": "2026-08-22T10:30:00Z"
}
```

### 2. `GET /api/projects/{project_id}/copilot/suggestions`

Returns state-driven question suggestions dynamically tailored to the repository's current telemetry, active priorities, and hotspots.

### 3. `GET /api/projects/{project_id}/copilot/context`

Returns the complete normalized `CopilotEvidenceContext` package for AI agent ingestion.

---

## 5. Frontend Dashboard UI (`/projects/:projectId/copilot`)

The interactive Copilot interface provides:

1. **Natural Language Query Console**: Instant response execution with hotkey shortcuts.
2. **Dynamic Suggestion Pills**: Quick questions reflecting current project state.
3. **Summary & Answerability Header**: Status badges (`Answerable` / `Insufficient Grounding`), detected intent, and narrative summary.
4. **3-Column Factual Decomposition**:
   - `[OBSERVED]` (Green badges: directly verified historical events)
   - `[INFERRED]` (Blue badges: mathematically computed intelligence)
   - `[UNKNOWN]` (Amber badges: known observation gaps)
5. **Prioritized Recommendations**: Direct actionable next steps with deep-link navigation.
6. **Related Entities & Universal Evidence Inspector Integration**: Clickable entity badges and `[Why?]` buttons to open the Evidence Drawer directly from any fact.
