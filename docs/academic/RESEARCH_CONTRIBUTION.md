# DepRadar: A Deterministic Event-Driven Architecture for Continuous Engineering Intelligence and Grounded AI Copilots

**Academic Contribution Document & Technical Treatise**

---

## 1. Problem Statement

Modern software engineering organizations struggle with fragmented, ephemeral visibility into development workflows. While version control systems (e.g., Git) capture milestone commits and CI/CD pipelines validate integrated builds, the granular, in-situ process of code creation—rapid prototyping, debug attempts, credential exposures, architectural drift, and resolution workflows—is largely lost.

## 2. Existing Development Workflow Problems

1. **Milestone Bias**: Git commits represent curated aftermath rather than actual development velocity and churn.
2. **Ephemeral Context**: Incidents are discussed in out-of-band communication channels (Slack, Jira) without durable causal links to the underlying code edits.
3. **LLM Hallucination & Risk**: Generative AI tools often fabricate architectural claims or leak unredacted credentials due to a lack of grounded, deterministic state projections.

## 3. Proposed DepRadar Architecture

DepRadar introduces a decoupled, 3-tier architecture:

- **Observation Daemon (Node.js)**: Continuous local filesystem monitoring and change hashing.
- **Intelligence Engine (FastAPI / PostgreSQL)**: Static AST parsing, multi-dimensional health scoring, predictive risk forecasting, and knowledge graph construction.
- **Command Center & Copilot (React / Vite)**: Real-time telemetry cockpit and deterministic query synthesis.

```
OBSERVE ──▶ DETECT ──▶ UNDERSTAND ──▶ INVESTIGATE ──▶ RESOLVE ──▶ LEARN ──▶ PREDICT ──▶ ASK ──▶ ACT
```

## 4. Continuous Development Telemetry

Development telemetry is captured at sub-second granularity as `development_events` and grouped into contiguous `sessions`. Telemetry includes diff chunks, file extensions, language categorizations, and change velocity metrics.

## 5. Evidence-Backed Engineering Intelligence

Every metric in DepRadar is traceable to concrete raw events. When a risk score or health grade is presented, the system generates an explicit mathematical breakdown and causal evidence chain.

## 6. Deterministic Intelligence

DepRadar avoids probabilistic approximations for core metrics. Intelligence states are computed as pure mathematical functions over stored PostgreSQL rows, guaranteeing that identical telemetry inputs always yield identical analytical projections ($A \equiv B$).

## 7. Security Intelligence & AST Guardrails

Static syntax analysis (Tree-Sitter / Python AST) executes on every file modification to detect:

- `SEC001`: Exposed API keys, tokens, and database connection strings.
- `DEBUG_TRUE`: Insecure debug flags enabled in configuration files.
- Raw secret tokens are automatically sanitized to `[REDACTED]` prior to persistence or display.

## 8. Incident Investigation & Causal Reconstruction

When security violations or high-churn anomalies occur, the system reconstructs an Investigation Incident containing:

- Multi-step timeline progressions.
- Subsystem impact assessments.
- Causal DAGs (Directed Acyclic Graphs) linking root cause events to downstream risks.

## 9. Resolution Memory & Collaborative Triage

Engineers can transition incidents through an explicit state machine (`OPEN` $\to$ `INVESTIGATING` $\to$ `REVIEWED` $\to$ `RESOLVED`) while attaching formal resolution notes. Transitions are immutably logged in `incident_review_history`, ensuring historical resolutions become permanent project memory.

## 10. Predictive Engineering Intelligence

Linear trend persistence, code churn acceleration, and hotspot concentration heuristics identify emerging failure modes and focus drift before they impact production releases.

## 11. Engineering Knowledge Graph

The system materializes a semantic graph comprising `Project`, `Subsystem`, `File`, `Finding`, and `Incident` nodes connected by typed edges:

- `CONTAINS` (Subsystem $\to$ File)
- `BELONGS_TO` (File $\to$ Subsystem)
- `AFFECTS` (Finding $\to$ File)
- `RESOLVED_BY` (Incident $\to$ Review)
- `SUPPORTS` (Evidence $\to$ Score)

## 12. AI Engineering Copilot Foundation

An orchestration and retrieval framework supporting 16 canonical engineering query families. The engine classifies queries deterministically and synthesizes natural summaries with concrete entity deep links without invoking external third-party LLMs.

## 13. Explainability & Provenance (Tri-State Model)

All copilot and scorecard claims carry explicit provenance markers:

- `[OBSERVED]`: Directly recorded empirical events.
- `[INFERRED]`: Deterministically computed health metrics and rankings.
- `[UNKNOWN]`: Explicit observation limits (e.g., remote CI runners or staging environments).

## 14. Deterministic Reconstructibility Proof

Let $T$ be the set of canonical telemetry events stored in PostgreSQL, and $f$ be the intelligence projection function. Reconstructibility guarantees:
$$\forall T, \quad f(T) \equiv f(T)$$
Derived state can be dropped at any time and reconstructed with 100% semantic fidelity.

## 15. Security, Privacy & Tenant Isolation

- **Secret Redaction**: Regex-based token masking ensures zero credentials appear in logs or exports.
- **Tenant Isolation**: Multi-project isolation ensures Project A queries cannot access Project B telemetry.
- **Filesystem Integrity**: Deleting a project removes database records only; local code is untouched.

## 16. Experimental Evaluation

Empirical benchmarks confirm all core operations execute in $< 115\text{ ms}$:

- Project Registration: $12.62\text{ ms}$
- Event Ingestion & AST: $14.05\text{ ms}$
- Health Calculation: $77.18\text{ ms}$
- Copilot Query Synthesis: $62.87\text{ ms}$
- Context Export: $111.65\text{ ms}$

## 17. Limitations

- Telemetry observation is currently scoped to local development environments; out-of-band cloud infrastructure changes are designated as `[UNKNOWN]`.
- Static AST rules target high-confidence security patterns and do not execute dynamic symbolic execution.

## 18. Future Work

- Integration with local open-weight LLMs (e.g., Llama, Mistral) via strict JSON schema boundaries.
- Pre-commit hook extensions for synchronous pre-push policy enforcement.
