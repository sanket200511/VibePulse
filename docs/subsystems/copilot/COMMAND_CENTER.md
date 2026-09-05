# DepRadar Engineering Command Center

## 1. Overview & Vision

The **DepRadar Engineering Command Center** is the unified live operational control room for software engineering teams and leadership. It represents the complete end-to-end causal intelligence loop:

$$\mathbf{OBSERVE \longrightarrow DETECT \longrightarrow INVESTIGATE \longrightarrow RESOLVE \longrightarrow LEARN \longrightarrow ANTICIPATE \longrightarrow HEALTH}$$

Instead of disjointed tools or opaque AI predictions, the Command Center orchestrates real-time repository telemetry into actionable engineering decisions backed by direct empirical evidence.

---

## 2. Core Capabilities

### 1. Live Intelligence Cascade Ribbon

Provides instant visual awareness of the active intelligence phase across the pipeline:

- **`OBSERVE`**: Real-time event ingestion from the local Telemetry Daemon (`/events` & `/ws/events`).
- **`DETECT`**: Static analysis & Security Guardian AST rule evaluation (e.g. `SEC001`, `DEBUG_TRUE`).
- **`INVESTIGATE`**: Multi-dimensional incident correlation and Investigation Evidence Graph 3.0.
- **`RESOLVE`**: Human triage decisions, resolution notes, and ownership transitions.
- **`LEARN`**: Long-term Project Context Memory and Engineering DNA synthesis.
- **`ANTICIPATE`**: Forecasting recurrence patterns, engineering hotspots, and drift velocity.
- **`HEALTH`**: 5-dimensional deterministic project health synthesis.

### 2. Unified Project Health & Five Dimensions

- **Security Health (25%)**: Inverted security risk score ($100 - \text{RiskScore}$).
- **Engineering Stability (20%)**: Derived from activity consistency, session continuity, and language ecosystem.
- **Incident Health (20%)**: Active triage load and unreviewed severity burden.
- **Resolution Health (15%)**: Historical resolution rate with automatic penalties for recurring regressions.
- **Predictive Risk Health (20%)**: Inverse of forecast strengths and hotspot concentration.

### 3. Actionable Priority Action Center ("What Should I Do Next?")

Deterministic ranking of top engineering interventions:

1. `REGRESSION_ALERT` (Score 95): Reopened findings where previous resolutions exist in review audit history.
2. `CRITICAL_INCIDENT` (Score 90): Open critical severity incidents affecting sensitive surfaces.
3. `SECURITY_REMEDIATION` (Score 82–90): Unmitigated AST security findings.
4. `HOTSPOT_REVIEW` (Score 72): High-velocity engineering hotspots.
5. `PREDICTIVE_PREVENTION` (Score 65): Recurrence risks with strong historical evidence.

### 4. Real-Time Event Stream & Downstream Causal Inspector

Interactive live stream connected via persistent WebSocket:

- Selecting any file event reveals the exact downstream causal chain:
  `Raw Event` $\rightarrow$ `AST Rule Trigger` $\rightarrow$ `Correlated Incident` $\rightarrow$ `Health Score Delta` $\rightarrow$ `Direct 1-Click Investigation Link`.

### 5. Engineering Hotspots & Focus Evolution

Visualizes hotspot concentration scores alongside chronological drift evolution (`Previous Focus` $\rightarrow$ `Current Focus` $\rightarrow$ `Emerging Focus`).

---

## 3. Strict Safety & Architecture Guarantees

1. **Zero Duplicate Engines**: Reuses canonical `security_intelligence`, `investigation`, `project_context`, `predictive_intelligence`, and `project_health`.
2. **PostgreSQL as Authoritative Source of Truth**: Command Center data is a 100% reconstructible projection ($A \equiv B$).
3. **Multi-Project Isolation**: Telemetry and health metrics are strictly segregated across project roots and IDs.
4. **Zero Raw Secret Leakage**: Strict `[REDACTED]` masking is enforced across API JSON, WebSocket frames, UI logs, and markdown exports.
