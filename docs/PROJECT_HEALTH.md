# Unified Project Health & Intelligence Orchestrator

## Overview

The **Unified Project Health & Intelligence Orchestrator** synthesizes all accumulated intelligence layers into a single, evidence-backed operational dashboard and priority ranking engine:

$$\mathbf{OBSERVE \longrightarrow DETECT \longrightarrow INVESTIGATE \longrightarrow RESOLVE \longrightarrow LEARN \longrightarrow ANTICIPATE \longrightarrow \left[\text{UNIFIED PROJECT HEALTH}\right]}$$

Rather than creating a redundant second intelligence pipeline, Sprint 7 acts as a pure **orchestration and composition layer** over:

1. **Project Context Memory** (`project_contexts`)
2. **Project Intelligence** (Activity series, session telemetry)
3. **Engineering DNA** (Development focus, pattern contrast)
4. **Security Intelligence 2.0** (Posture, findings, risk explanation)
5. **Investigation Engine 3.0** (Evidence Graph, Incident Metrics)
6. **Incident Collaboration & Resolution Intelligence** (`incident_review_history`, `incident_review_states`)
7. **Predictive Engineering Intelligence** (Forecast signals, engineering hotspots, focus drift)

---

## The Five Deterministic Health Dimensions

$$\text{Overall Health Score} = \sum_{i=1}^5 \left( w_i \times \text{Dimension Score}_i \right)$$

Overall score is classified into standard operational grades:

- **`90 - 100`**: `EXCELLENT`
- **`75 - 89`**: `HEALTHY`
- **`60 - 74`**: `NEEDS_ATTENTION`
- **`40 - 59`**: `DEGRADED`
- **`0 - 39`**: `CRITICAL`

| Dimension                     | Weight ($w_i$) | Formulation / Reused Canonical Source                                                                         | Key Contributing Signals                                                    |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **1. Security Health**        | 25%            | $100 - \text{SecurityRiskScore}$ (bounded 0–100) from `SecurityIntelligenceRead.risk_explanation.total_score` | Critical/High findings count, sensitive file exposures, AST guardian alerts |
| **2. Engineering Stability**  | 20%            | Derived from `ProjectIntelligence` activity series, modification burst stability, and file churn              | Event distribution, session continuity, language ecosystem consistency      |
| **3. Incident Health**        | 20%            | $100 - (\text{open\_critical} \times 30 + \text{open\_high} \times 15 + \text{open\_incidents} \times 10)$    | Active triage load from `IncidentMetrics`, unreviewed incident severity     |
| **4. Resolution Health**      | 15%            | $\text{ResolutionRate}\% \times 0.6 + (100 - \text{RegressionPenalty}) \times 0.4$                            | Percentage of triaged incidents resolved, absence of recurring regressions  |
| **5. Predictive Risk Health** | 20%            | $100 - (\text{HighestForecastScore} \times 0.7 + \text{HotspotsPenalty})$                                     | High-strength forecasts, hotspot score severity, focus drift volatility     |

---

## Actionable Priority Engine ("What Should I Do Next?")

The Priority Engine deterministically synthesizes and ranks all operational candidates across:

1. **`REGRESSION_ALERT`** (Priority Urgency 95): Reopened findings where previous resolutions exist in review audit history.
2. **`CRITICAL_INCIDENT`** (Priority Urgency 90): Open critical severity incidents touching sensitive files.
3. **`SECURITY_REMEDIATION`** (Priority Urgency 82–90): Unmitigated AST security findings (e.g. `SEC001`, `DEBUG_TRUE`).
4. **`HOTSPOT_REVIEW`** (Priority Urgency 72): High-velocity engineering hotspots.
5. **`PREDICTIVE_PREVENTION`** (Priority Urgency 65): Recurrence risks with strong historical evidence.

### Deterministic Sorting Order

1. `priority_score` (Descending)
2. `severity` rank (`CRITICAL` > `HIGH` > `MEDIUM` > `LOW`)
3. `title` alphabetical ascending (Deterministic tie-breaking)

---

## Explicit Insufficient Evidence State

When repository telemetry is below minimum empirical thresholds ($<2$ events, no sessions, no findings):

- `status`: `"INSUFFICIENT_EVIDENCE"`
- `overall_health_score`: `null`
- `grade`: `"INSUFFICIENT_EVIDENCE"`
- `status_message`: _"Insufficient historical telemetry to determine project health. Record development activity to establish baseline."_
- `top_priorities`: `[]`

---

## REST API Reference

| Method | Endpoint                                       | Description                                                                     |
| ------ | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `GET`  | `/api/projects/{project_id}/health`            | Retrieve complete 5-dimensional unified health model and top priorities.        |
| `GET`  | `/api/projects/{project_id}/health/priorities` | Retrieve ranked actionable "What Should I Do Next?" priority items.             |
| `POST` | `/api/projects/{project_id}/health/refresh`    | Force deterministic re-aggregation and recalculation from PostgreSQL telemetry. |

---

## Project Context Memory Export Integration

`PROJECT_CONTEXT.md` automatically includes **Section 18: Unified Project Health & Actionable Priorities**:

```markdown
## 18. Unified Project Health & Actionable Priorities

- **Overall Health**: `89/100` (HEALTHY)
- **Security Health**: `100/100` (OPTIMAL)
- **Engineering Stability**: `100/100` (OPTIMAL)
- **Incident Health**: `100/100` (OPTIMAL)
- **Resolution Health**: `100/100` (OPTIMAL)
- **Predictive Risk Health**: `47/100` (DEGRADED)

### Actionable Priorities (What Should I Do Next?)

| Rank | Priority Item                                 | Severity | Urgency  | Subsystem          | Recommended Action                          |
| ---- | --------------------------------------------- | -------- | -------- | ------------------ | ------------------------------------------- |
| `#1` | **Prevent Recurrence: Change Velocity Burst** | `HIGH`   | `65/100` | `Core Application` | Review recent modifications before merging. |
```
