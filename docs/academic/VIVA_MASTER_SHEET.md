# DepRadar — Examiner Viva Master Defense Sheet

**Purpose**: High-impact, defensible, oral answers for project evaluators, professors, and examiners.
**Core Motto**: _Observe continuously. Derive deterministically. Never hallucinate._

---

## 1. Verbal Introductions

### 30-Second Elevator Pitch

> _"DepRadar is a deterministic engineering intelligence platform that observes local filesystem activity in real time. Instead of waiting for Git commits or CI/CD pipelines, DepRadar continuously captures developer churn, analyzes syntax with static AST rules, detects hardcoded secrets with automatic `[REDACTED]` masking, and provides a 100% deterministic AI Copilot over 16 canonical query families with zero hallucination risk."_

### 1-Minute Executive Summary

> _"Traditional engineering tools suffer from milestone bias: they only see code after it is committed or deployed. DepRadar introduces continuous filesystem telemetry via a local Node.js daemon that streams events to a FastAPI intelligence engine backed by PostgreSQL. From this single ground truth, DepRadar calculates a 5-dimension Unified Health Score ($0 \dots 100$), correlates security incidents with causal DAGs, forecasts code churn hotspots, and builds a semantic Knowledge Graph. Crucially, our Copilot interface uses deterministic query routing with explicit fact provenance—`[OBSERVED]`, `[INFERRED]`, and `[UNKNOWN]`—ensuring that every statement is strictly backed by database evidence."_

### 3-Minute Technical Walkthrough

> _"DepRadar operates on a 10-stage canonical lifecycle: **Observe, Detect, Understand, Investigate, Resolve, Learn, Predict, Ask, Act, and Memory**._
>
> 1. _In Stage 1 (Observe), our daemon captures debounced file modifications and hashes diffs into PostgreSQL `development_events`._
> 2. _In Stage 2 (Detect), Tree-Sitter and Python AST analyzers inspect syntax to catch `SEC001` hardcoded credentials and `DEBUG_TRUE` flags, automatically masking raw tokens to `[REDACTED]`._
> 3. _In Stages 3 & 4 (Understand & Investigate), we compute additive risk scores and reconstruct multi-step causal graphs linking initial file modifications to security violations._
> 4. _In Stages 5 & 6 (Resolve & Learn), engineers remediate code and submit triage notes, creating an immutable audit trail in `incident_review_history`._
> 5. _In Stage 7 (Predict), linear regression models evaluate churn velocity and subsystem hotspots._
> 6. _In Stage 8 (Ask), our Copilot handles 16 canonical query domains with an Answerability Gate that rejects out-of-scope queries like Bitcoin prices without guessing._
> 7. _In Stages 9 & 10 (Act & Memory), code fixes trigger closed-loop health score recovery, and the system exports a portable 22-section `PROJECT_CONTEXT.md`._
>    _Across 348 backend tests and 130 daemon tests, we have proven that intelligence states can be cleared and deterministically reconstructed from PostgreSQL historical events ($A \equiv B$)."_

---

## 2. Trick & Critical Questions (35 Master Answers)

### Q1: Why not use Git instead of building a filesystem daemon?

> **Answer**: Git only records milestone commits explicitly saved by the developer. It is blind to uncommitted churn, rapid prototyping, transient credential leaks, and debug configurations that happen during development.

### Q2: Why not build an IDE plugin (e.g. VS Code extension)?

> **Answer**: An OS-level daemon is editor-agnostic. It continues observing when developers switch between VS Code, Cursor, PyCharm, Vim, or run scripts in the terminal.

### Q3: Why not use an external LLM (like GPT-4 or Claude)?

> **Answer**: Generative LLMs are non-deterministic, prone to hallucination, introduce high API latency and cost, and risk leaking proprietary code to third-party cloud servers. DepRadar achieves sub-65ms deterministic query synthesis by querying relational ground truth directly.

### Q4: Isn't your Copilot just rule-based?

> **Answer**: Yes, and that is an intentional engineering design. It is a deterministic classifier and multi-domain canonical retriever. For mission-critical engineering telemetry and security risk metrics, determinism and exact mathematical provenance are far more reliable than probabilistic approximations.

### Q5: Where is the "AI" in DepRadar?

> **Answer**: The intelligence lies in automated static AST pattern matching, multi-dimensional weighted composite scoring ($W_i \times S_i$), causal incident graph reconstruction, linear regression churn forecasting, and semantic knowledge graph projection.

### Q6: What is actually novel in this project?

> **Answer**: The novel contribution is the unified deterministic event-driven architecture that connects continuous in-situ filesystem telemetry directly to explainable health scoring, causal incident graphs, and evidence-bounded copilot queries with guaranteed reconstructibility ($A \equiv B$).

### Q7: How is this different from GitHub Copilot?

> **Answer**: GitHub Copilot is a code-completion tool that generates lines of code inside an editor. DepRadar is a project-level engineering intelligence platform that evaluates repository health, security posture, churn hotspots, and resolution history.

### Q8: How is this different from SonarQube?

> **Answer**: SonarQube runs batch scans on integrated builds. DepRadar observes continuous sub-second developer churn as code is being edited, providing instant feedback and preserving historical causal timelines.

### Q9: How is this different from Sentry?

> **Answer**: Sentry captures runtime application crashes in production. DepRadar observes pre-commit development activity and code construction on the developer's local workstation.

### Q10: What happens when the FastAPI backend is down?

> **Answer**: The daemon attempts HTTP delivery with configuration-driven exponential backoff (`PublisherConfig.retryMaxNormal`). If the backend recovers within the retry window, events are ingested seamlessly; if downtime exceeds the retry budget, an error is logged.

### Q11: What happens after retry limits are exhausted?

> **Answer**: The HTTP publisher logs an error for the failed event. To prevent unbounded memory growth, the daemon does not maintain an infinite offline disk queue.

### Q12: What happens if PostgreSQL crashes?

> **Answer**: PostgreSQL provides ACID transaction durability. Once the database service restarts, all previously persisted projects, sessions, events, and incident review records are completely restored.

### Q13: What happens if the daemon crashes?

> **Answer**: Because filesystem state is persistent on disk, restarting the daemon establishes a fresh baseline session and resumes watching the target project directory.

### Q14: Can your system detect every possible security vulnerability?

> **Answer**: No. DepRadar uses high-precision static AST rules (`SEC001`, `DEBUG_TRUE`, credential regex) to catch common misconfigurations and credential leaks without execution overhead. It is not a full dynamic symbolic execution engine.

### Q15: Can your system predict production failures?

> **Answer**: No. Predictive intelligence evaluates engineering risk signals (e.g. churn velocity, high-frequency file modifications, and resolution regressions). It forecasts code stability risks, not external infrastructure outages.

### Q16: Why do you call it "Predictive Intelligence"?

> **Answer**: Because it uses linear trend regression over historical event sequences to project future code churn acceleration and identify files experiencing abnormal churn velocity before they merge.

### Q17: What does $A \equiv B$ actually prove?

> **Answer**: It proves deterministic reconstructibility: all derived intelligence states (Health, Security, Predictions, Knowledge Graph) are pure mathematical projections over PostgreSQL events. If derived memory is dropped, recomputing over raw events yields the exact same state.

### Q18: What are your false-positive limitations?

> **Answer**: Synthetic test keys or commented-out configuration examples matching credential regex patterns can trigger `SEC001`. Developers can resolve these via the Incident Triage workflow.

### Q19: What is your biggest limitation?

> **Answer**: Observation is bounded to the local workstation filesystem; remote CI/CD runner execution and multi-developer git merge conflicts are categorized as `[UNKNOWN]`.

### Q20: What part of the system is deterministic?

> **Answer**: 100% of the scoring formulas, AST rule matches, query classification, knowledge graph edges, and Copilot response templates are deterministic.

### Q21: What part is inferred?

> **Answer**: Health grades, priority rankings, forecast signals, and incident causal DAGs are mathematical inferences derived from empirical telemetry.

### Q22: What is observed?

> **Answer**: Raw file modification timestamps, diff chunks, file extensions, and language classifications recorded in `development_events`.

### Q23: Why PostgreSQL instead of MongoDB or Redis?

> **Answer**: Relational foreign keys and ACID transactions are required to maintain strict referential integrity between `projects`, `sessions`, `development_events`, and `incident_review_history`.

### Q24: Why FastAPI?

> **Answer**: FastAPI offers asynchronous I/O (`asyncpg`), built-in Pydantic schema validation, and native WebSocket support with sub-millisecond route handling in Python 3.12.

### Q25: Why React and Vite?

> **Answer**: Vite provides instant HMR for real-time telemetry dashboards, and React allows modular state management for live WebSocket streaming.

### Q26: Why Tree-Sitter?

> **Answer**: Tree-Sitter provides concrete syntax tree parsing across multiple languages with sub-millisecond parsing times on incremental file edits.

### Q27: Why Chokidar?

> **Answer**: Chokidar is a battle-tested Node.js wrapper over OS-level file events (`fsevents`, `inotify`, `ReadDirectoryChangesW`) that handles debouncing and file locking.

### Q28: Why WebSockets instead of polling?

> **Answer**: WebSockets push live filesystem events and incident status changes to the frontend in under 5ms without polling overhead.

### Q29: Why not use Kafka or Redis message brokers?

> **Answer**: For a single workstation architecture, an in-process FastAPI WebSocket broadcaster and direct HTTP event ingestion provide sub-15ms throughput without the operational burden of a distributed message broker.

### Q30: What happens with very large repositories (100k+ files)?

> **Answer**: Chokidar ignores standard directories (`.git`, `node_modules`, `venv`, `dist`), focusing observation solely on active source code files.

### Q31: Does it scale to multiple developers?

> **Answer**: Multi-tenant isolation is supported at the database level by partitioning by `project_id`. Each developer runs a local daemon streaming to a centralized API.

### Q32: Is this production-ready?

> **Answer**: DepRadar is fully verified for local development and academic evaluation within its documented workstation scope. Production deployment would require containerized daemon agents and distributed PostgreSQL clustering.

### Q33: What would you change if given 6 more months?

> **Answer**: Implement pre-commit Git policy enforcement hooks and add an optional local open-weight LLM adapter (e.g. Llama 3) operating inside strict JSON schema constraints.

### Q34: What is your strongest research contribution?

> **Answer**: The formulation and implementation of a closed-loop, deterministic engineering intelligence pipeline that proves that developer activity can be explained, investigated, and queried with zero generative hallucination.

### Q35: How does secret redaction work under the hood?

> **Answer**: Regex-based token sanitizers intercept diff chunks and event strings at the boundary, replacing identified secret values with `[REDACTED]` before writing to PostgreSQL or streaming over WebSockets.
