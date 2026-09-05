# DepRadar — Examiner Viva & Defense Preparation (Truth-Audited)

**Audience**: Project Evaluators, University Professors, Viva Panels
**Purpose**: Direct, implementation-grounded, defensible answers to examiner questions.

---

### Q1: What problem does DepRadar solve?

> **Answer**: `[VERIFIED]` DepRadar addresses the lack of continuous visibility into granular in-situ software development. While Git records milestone commits and CI/CD tests merged builds, DepRadar captures the granular, real-time evolution of code—detecting security bugs, hotspots, and architectural drift before code is committed or deployed.

### Q2: Why use filesystem telemetry instead of Git hooks or IDE plugins?

> **Answer**: `[VERIFIED]` Filesystem telemetry via an OS-level daemon is editor-agnostic and language-agnostic. It captures uncommitted churn, transient edits, and multi-file scratchpad work without requiring developers to change their existing tools or remember to trigger commands.

### Q3: Why is PostgreSQL the single canonical source of truth?

> **Answer**: `[ARCHITECTURAL GUARANTEE]` Relying on a relational database ensures ACID compliance, durability, and multi-tenant project isolation. All intelligence layers (Health, Predictions, Knowledge Graph, Copilot) are pure deterministic projections over stored historical events, guaranteeing complete reconstructibility ($A \equiv B$).

### Q4: Why doesn't DepRadar use an LLM for its core Copilot?

> **Answer**: `[VERIFIED]` LLMs are non-deterministic, prone to hallucination, expensive to run, and risk leaking proprietary code. By using deterministic intent classification and multi-domain canonical retrieval, DepRadar guarantees evidence-bounded factual responses without third-party API dependencies.

### Q5: How does DepRadar avoid hallucinating facts?

> **Answer**: `[VERIFIED]` Every assertion is strictly bound to database rows through our Answerability Gate. If an entity or question falls outside observed telemetry (e.g. Bitcoin price or weather), the system explicitly returns `answerable: false` and `evidence_strength: INSUFFICIENT`.

### Q6: What is the meaning of `[OBSERVED]`?

> **Answer**: `[VERIFIED]` Empirical ground truth directly recorded in PostgreSQL (e.g. a specific file modification timestamp, diff chunk, or AST rule match).

### Q7: What is the meaning of `[INFERRED]`?

> **Answer**: `[VERIFIED]` Intelligence derived from mathematical models and heuristics (e.g. 5-dimension health scores, priority rankings, regression forecasts).

### Q8: What is the meaning of `[UNKNOWN]`?

> **Answer**: `[VERIFIED]` Explicit observation boundaries (e.g. unobserved cloud infrastructure, remote CI runners, or production secrets).

### Q9: How is the Overall Health Score calculated?

> **Answer**: `[VERIFIED]` It is a weighted composite of 5 dimensions: Security Health ($25\%$), Engineering Stability ($20\%$), Incident Health ($20\%$), Resolution Health ($15\%$), and Predictive Risk Health ($20\%$).

### Q10: How is the Risk Score different from the Health Score?

> **Answer**: `[VERIFIED]` Health Score ($0 \dots 100$) is a positive indicator where **higher is better**. Security Risk Score is an additive penalty where **higher is worse**, reflecting unmitigated AST security rules and credential leaks.

### Q11: What is Forecast Strength?

> **Answer**: `[VERIFIED]` An empirical measure ($0 \dots 100$) reflecting the statistical volume and time-series density of telemetry supporting a predictive forecast.

### Q12: How does Security Intelligence work?

> **Answer**: `[VERIFIED]` It performs static AST parsing (via Tree-Sitter and Python AST) on every file modification event, matching rules like `SEC001` (hardcoded credentials) and `DEBUG_TRUE` without executing the code.

### Q13: How are secrets protected?

> **Answer**: `[VERIFIED]` Regex-based token sanitizers automatically mask raw credentials to `[REDACTED]` before they are written to disk, stored in memory, sent via WebSockets, or exported to markdown.

### Q14: How does incident correlation work?

> **Answer**: `[VERIFIED]` When high-severity AST findings or burst activity occur in a subsystem, the investigation engine groups related events into an Incident object and computes a composite risk score.

### Q15: How does root cause analysis work?

> **Answer**: `[VERIFIED]` The system traverses the chronological event sequence to identify the earliest modifying event and AST violation that initiated the risk escalation, constructing a causal DAG.

### Q16: How does the Knowledge Graph work?

> **Answer**: `[VERIFIED]` It materializes 9 node types (`Project`, `Subsystem`, `Technology`, `File`, `Session`, `SecurityFinding`, `Incident`, `Prediction`, `Priority`) and 8 verified edge types (`CONTAINS`, `USED_BY`, `BELONGS_TO`, `ASSOCIATED_WITH`, `IMPACTS`, `RESOLVED_BY`, `FORECASTS`, `PRIORITIZES`) directly from PostgreSQL relationships.

### Q17: How does Copilot work without an LLM?

> **Answer**: `[VERIFIED]` It uses a 16-family deterministic classifier, queries the canonical PostgreSQL database via specialized domain services, and formats the response using structured narrative templates with explicit tri-state facts.

### Q18: How is reconstructibility proven?

> **Answer**: `[VERIFIED]` If all derived state in memory or secondary caches is deleted, recomputing the intelligence projection over raw `development_events` yields the exact same numerical scores, dimension weights, and graph topologies ($A \equiv B$).

### Q19: What happens if the API crashes?

> **Answer**: `[VERIFIED]` The Node.js observation daemon uses configuration-driven retry with exponential backoff (`PublisherConfig.retryMaxNormal` and `retryMaxCritical`). When the API becomes available within the retry window, events are delivered and historical telemetry remains intact in PostgreSQL.

### Q20: What happens if PostgreSQL restarts?

> **Answer**: `[ARCHITECTURAL GUARANTEE]` PostgreSQL ensures full ACID durability. Upon reconnection, all projects, sessions, events, and incident review histories are preserved.

### Q21: What happens when a project is deleted?

> **Answer**: `[VERIFIED]` DepRadar executes a cascading database delete of its internal telemetry records, but **never** touches the user's physical repository or files on disk.

### Q22: What are the primary system limitations?

> **Answer**: `[CURRENT LIMITATION]` Telemetry is scoped to local workstation activity and static AST rules; remote cloud runners, CI/CD pipelines, and production container metrics are outside the current observation boundary (`[UNKNOWN]`).

### Q23: What would you add in the future?

> **Answer**: Pre-commit policy enforcement hooks and an optional local open-weight LLM adapter (e.g., Llama 3) that consumes the deterministic context package.

### Q24: How is DepRadar different from GitHub?

> **Answer**: `[VERIFIED]` GitHub stores milestone commits and pull requests. DepRadar observes the continuous, granular process of writing code in real time before commits occur.

### Q25: How is DepRadar different from an IDE?

> **Answer**: `[VERIFIED]` IDEs focus on code editing and language servers for a single file. DepRadar provides a multi-dimensional project intelligence platform connecting security, health, predictions, and cross-file causal histories.
