# VibePulse — Examiner Viva & Defense Preparation

**Audience**: Project Evaluators, University Professors, Viva Panels  
**Purpose**: Direct, implementation-grounded answers to examiner questions.

---

### Q1: What problem does VibePulse solve?
> **Answer**: VibePulse solves the lack of continuous, in-situ visibility into software development. While Git records milestone commits and CI/CD tests merged builds, VibePulse captures the granular, real-time evolution of code—detecting security bugs, hotspots, and architectural drift before code is committed or deployed.

### Q2: Why use filesystem telemetry instead of Git hooks or IDE plugins?
> **Answer**: Filesystem telemetry via an OS-level daemon is editor-agnostic and language-agnostic. It captures uncommitted churn, transient edits, and multi-file scratchpad work without requiring developers to change their existing tools or remember to trigger commands.

### Q3: Why is PostgreSQL the single canonical source of truth?
> **Answer**: Relying on a relational database ensures ACID compliance, durability, and multi-tenant project isolation. All intelligence layers (Health, Predictions, Knowledge Graph, Copilot) are pure deterministic projections over stored historical events, guaranteeing complete reconstructibility ($A \equiv B$).

### Q4: Why doesn't VibePulse use an LLM for its core Copilot?
> **Answer**: LLMs are non-deterministic, prone to hallucination, expensive to run, and risk leaking proprietary code. By using deterministic intent classification and multi-domain canonical retrieval, VibePulse guarantees 100% factual accuracy and zero hallucination.

### Q5: How does VibePulse avoid hallucinating facts?
> **Answer**: Every assertion is strictly bound to database rows through our Answerability Gate. If an entity or question falls outside observed telemetry (e.g. Bitcoin price or weather), the system explicitly returns `answerable: false` and `evidence_strength: INSUFFICIENT`.

### Q6: What is the meaning of `[OBSERVED]`?
> **Answer**: Empirical ground truth directly recorded in PostgreSQL (e.g. a specific file modification timestamp, diff chunk, or AST rule match).

### Q7: What is the meaning of `[INFERRED]`?
> **Answer**: Intelligence derived from mathematical models and heuristics (e.g. 5-dimension health scores, priority rankings, regression forecasts).

### Q8: What is the meaning of `[UNKNOWN]`?
> **Answer**: Explicit observation boundaries (e.g. unobserved cloud infrastructure, remote CI runners, or production secrets).

### Q9: How is the Overall Health Score calculated?
> **Answer**: It is a weighted composite of 5 dimensions: Security Health ($25\%$), Engineering Stability ($20\%$), Incident Health ($20\%$), Resolution Health ($15\%$), and Predictive Risk Health ($20\%$).

### Q10: How is the Risk Score different from the Health Score?
> **Answer**: Health Score ($0 \dots 100$) is a positive indicator where **higher is better**. Security Risk Score is an additive penalty where **higher is worse**, reflecting unmitigated AST security rules and credential leaks.

### Q11: What is Forecast Strength?
> **Answer**: An empirical measure ($0 \dots 100$) reflecting the statistical volume and time-series density of telemetry supporting a predictive forecast.

### Q12: How does Security Intelligence work?
> **Answer**: It performs static AST parsing (via Tree-Sitter and Python AST) on every file modification event, matching rules like `SEC001` (hardcoded credentials) and `DEBUG_TRUE` without executing the code.

### Q13: How are secrets protected?
> **Answer**: Regex-based token sanitizers automatically mask raw credentials to `[REDACTED]` before they are written to disk, stored in memory, sent via WebSockets, or exported to markdown.

### Q14: How does incident correlation work?
> **Answer**: When high-severity AST findings or burst activity occur in a subsystem, the investigation engine groups related events into an Incident object and computes a composite risk score.

### Q15: How does root cause analysis work?
> **Answer**: The system traverses the chronological event sequence to identify the earliest modifying event and AST violation that initiated the risk escalation, constructing a causal DAG.

### Q16: How does the Knowledge Graph work?
> **Answer**: It materializes nodes (`Project`, `Subsystem`, `File`, `Finding`, `Incident`) and verified edges (`CONTAINS`, `BELONGS_TO`, `AFFECTS`, `RESOLVED_BY`, `SUPPORTS`) directly from PostgreSQL relationships.

### Q17: How does Copilot work without an LLM?
> **Answer**: It uses a 16-family deterministic classifier, queries the canonical PostgreSQL database via specialized domain services, and formats the response using structured narrative templates with explicit tri-state facts.

### Q18: How is reconstructibility proven?
> **Answer**: If all derived state in memory or secondary tables is deleted, recomputing the intelligence projection over the raw `development_events` yields the exact same numerical scores and graph topologies ($A \equiv B$).

### Q19: What happens if the API crashes?
> **Answer**: The Node.js observation daemon queues pending events. When the API restarts, all historical telemetry remains intact in PostgreSQL and live event ingestion resumes seamlessly.

### Q20: What happens if PostgreSQL restarts?
> **Answer**: PostgreSQL ensures full ACID durability. Upon reconnection, all projects, sessions, events, and incident review histories are preserved.

### Q21: What happens when a project is deleted?
> **Answer**: VibePulse executes a cascading database delete of its internal telemetry records, but **never** touches the user's physical code on disk.

### Q22: What are the primary system limitations?
> **Answer**: Telemetry is scoped to local workstation activity and static AST rules; remote cloud runners and production telemetry are outside the current observation boundary.

### Q23: What would you add in the future?
> **Answer**: Pre-commit policy enforcement hooks and an optional local open-weight LLM adapter (e.g., Llama 3) that consumes the deterministic context package.

### Q24: How is VibePulse different from GitHub?
> **Answer**: GitHub stores milestone commits and pull requests. VibePulse observes the continuous, granular process of writing code in real time before commits occur.

### Q25: How is VibePulse different from an IDE?
> **Answer**: IDEs focus on code editing and language servers for a single file. VibePulse provides a multi-dimensional project intelligence platform connecting security, health, predictions, and cross-file causal histories.
