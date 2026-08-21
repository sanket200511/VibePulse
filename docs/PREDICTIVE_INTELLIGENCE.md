# Predictive Engineering Intelligence

## Overview

**Predictive Engineering Intelligence** extends VibePulse from reactive investigation and resolution into evidence-backed anticipation:

$$\text{OBSERVE} \longrightarrow \text{DETECT} \longrightarrow \text{INVESTIGATE} \longrightarrow \text{RESOLVE} \longrightarrow \text{LEARN} \longrightarrow \mathbf{ANTICIPATE}$$

Rather than relying on ungrounded or non-deterministic machine learning hallucinations, VibePulse projects future engineering risks and hotspots **strictly from the empirical telemetry and security analyses already recorded in PostgreSQL**.

Every forecast is accompanied by an **additive score breakdown**, **explicit evidence strength**, and direct deep-links into the **Evidence Graph 3.0** and **Incident Resolution Center**.

---

## Architectural Principles & Invariants

1. **PostgreSQL as Authoritative Ground Truth**:
   All forecasts are derived projections over `development_events`, `sessions`, `event_analyses`, `project_contexts`, and `incident_review_history`.
2. **Deterministic Reconstructibility ($A \equiv B$)**:
   Clearing caches or re-running the projection engine over identical historical telemetry produces identical forecasts, scores, and explanations.
3. **No Fabricated ML Confidence**:
   Probabilities like "98% accurate prediction" or fabricated CVEs are strictly prohibited. Forecast strength is expressed as an **additive empirical score (0–100)** derived from observable signals.
4. **Explicit Insufficient-Evidence State**:
   When repository telemetry is below minimum empirical thresholds (e.g. fewer than 2 events and no recorded sessions/findings), the system returns an explicit `INSUFFICIENT_EVIDENCE` status rather than synthetic predictions.
5. **Strict Secret Redaction**:
   All sensitive tokens, credentials, and API keys are masked to `[REDACTED]` prior to summary projection or markdown rendering.
6. **Multi-Project Isolation**:
   Projections are strictly scoped by `project_id` and normalized repository roots. Deleting a project purges its derived cache and never impacts other workspaces.

---

## Predictive Signal Engine

The production engine (`DeterministicPredictiveProvider`) evaluates seven core deterministic signals:

| Signal Type                                         | Description                                                                            | Evidence Source                           | Score Contribution        |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------- |
| **Activity Acceleration** (`CHANGE_BURST`)          | Rapid surge in modification events across active sessions.                             | `DevelopmentEvent` timestamps & frequency | $+25 \text{ to } +35$     |
| **Security Recurrence** (`SECURITY_RECURRENCE`)     | Repeated occurrence of specific security rules across multiple sessions/files.         | `EventAnalysis` findings (`rule_id`)      | $+35 \text{ to } +55$     |
| **Engineering Hotspots** (`ENGINEERING_HOTSPOT`)    | High modification volume intersecting with sensitive subsystems and security findings. | File-level event counts & AST analyses    | $+35 \text{ to } +60$     |
| **Resolution Regression** (`RESOLUTION_REGRESSION`) | Reappearance of a security rule in an area previously marked as `RESOLVED`.            | `IncidentReviewHistory` audit trail       | $+40 \text{ to } +50$     |
| **Engineering Focus Drift** (`FOCUS_DRIFT`)         | Measurable shift in active engineering effort between subsystems over time.            | Session language & directory telemetry    | Drift summary progression |
| **Surface Expansion** (`SURFACE_EXPANSION`)         | Proportional increase in events touching authentication, configuration, or secrets.    | Path classifier heuristics                | $+15 \text{ to } +25$     |

---

## Forecast Scoring & Evidence Strength Model

### Additive Forecast Score (0–100)

The Forecast Score is computed by summing the contributing empirical factors:

$$\text{Forecast Score} = \min\left(100, \sum \text{Factor Weight}\right)$$

Example Score Breakdown:

```json
{
  "activity_acceleration": 25,
  "security_recurrence": 35,
  "hotspot_concentration": 20,
  "sensitive_surface_touch": 15,
  "resolution_regression": 0,
  "trend_persistence": 0,
  "explanation": [
    "+35 rule recurrence (2 occurrences)",
    "+25 activity volume (4 events)",
    "+20 hotspot concentration score for Authentication & Security",
    "+15 sensitive surface impact"
  ]
}
```

### Evidence Strength Levels

- **`STRONG`**: Multiple corroborating signals across distinct sessions and explicit finding records.
- **`MODERATE`**: Observable single-session cluster or elevated file modification frequency.
- **`LOW`**: Emerging single-point observation without multi-event historical reinforcement.
- **`INSUFFICIENT`**: Telemetry volume below baseline threshold to produce reliable projections.

---

## Pluggable Provider Interface

VibePulse defines an abstract provider interface allowing future external or local ML providers to be plugged in alongside the deterministic baseline:

```python
class PredictiveSignalProvider(ABC):
    @abstractmethod
    async def generate_predictions(
        self,
        db: AsyncSession,
        project: Project,
        events: list[DevelopmentEvent],
        sessions: list[Session],
        analyses: list[EventAnalysis],
        sec_intel: SecurityIntelligenceRead,
        proj_context: ProjectContextRead,
        review_history: list[IncidentReviewHistory],
    ) -> tuple[
        list[PredictiveSignal],
        list[HotspotItem],
        list[RecurringRiskItem],
        EngineeringDriftSummary,
        list[PredictiveTrendPoint],
        str,
        str,
    ]:
        ...
```

The active provider is configured via `_DEFAULT_PROVIDER` in `service.py`.

---

## REST API Reference

| Method | Endpoint                                                 | Description                                                           |
| ------ | -------------------------------------------------------- | --------------------------------------------------------------------- |
| `GET`  | `/api/projects/{project_id}/predictions`                 | Retrieve complete predictive engineering summary and forecasts.       |
| `GET`  | `/api/projects/{project_id}/predictions/summary`         | Alias for top-level predictive posture summary.                       |
| `GET`  | `/api/projects/{project_id}/predictions/hotspots`        | Retrieve ranked engineering hotspots and modification frequencies.    |
| `GET`  | `/api/projects/{project_id}/predictions/trends`          | Retrieve rolling 7-day chronological development and security trends. |
| `POST` | `/api/projects/{project_id}/predictions/refresh`         | Force re-calculation and derived cache invalidation.                  |
| `GET`  | `/api/projects/{project_id}/predictions/{prediction_id}` | Retrieve granular evidence breakdown for a specific signal.           |

---

## Dashboard Command Center

The **Predictive Engineering Center** is accessible at `/projects/:projectId/predictions`:

1. **"What Should We Watch Next?" Hero Section**:
   - Ranked forecast cards displaying severity, evidence strength, time horizon, and additive score gauges.
   - 1-click **[Investigate Incident]** integration linking directly to Evidence Graph 3.0.
   - **[View Additive Evidence]** drawer displaying full score formulation and affected files.
2. **Engineering Hotspots Map**:
   - Subsystem and file ranking with gradient progress bars, activity counts, and velocity indicators.
3. **Engineering Focus Drift**:
   - Chronological progression flow: `Previous Focus` $\rightarrow$ `Current Focus` $\rightarrow$ `Emerging Focus`.
4. **Historical Activity Trends (Rolling 7 Days)**:
   - Multi-metric daily cards visualizing development events and security findings.
5. **Insufficient Evidence State**:
   - Clear operational guidance when observing fresh repositories.

---

## Project Context Memory Integration

`PROJECT_CONTEXT.md` automatically includes **Section 17: Predictive Engineering Signals**:

```markdown
## 17. Predictive Engineering Signals

- **Status**: `READY` (Predictive Engineering Intelligence active. Forecasts derived from observed history.)
- **Active Forecasts Count**: `3`
- **Active Hotspots**: `2`
- **Engineering Focus Drift**: `Core Application Setup -> Authentication & Security -> Security & Validation`

### Evidence-Backed Forecasts

| Forecast Signal                                | Severity   | Strength | Score    | Horizon      | Recommended Action                              |
| ---------------------------------------------- | ---------- | -------- | -------- | ------------ | ----------------------------------------------- |
| **Recurrence Risk: Hardcoded Secret (SEC001)** | `CRITICAL` | `STRONG` | `85/100` | `SHORT_TERM` | Apply pre-commit hooks and externalize secrets. |

### Top Engineering Hotspots

| Subsystem                     | File Target         | Hotspot Score | Activity Count | Findings |
| ----------------------------- | ------------------- | ------------- | -------------- | -------- |
| **Authentication & Security** | `src/auth/login.py` | `70/100`      | `4`            | `2`      |
```
