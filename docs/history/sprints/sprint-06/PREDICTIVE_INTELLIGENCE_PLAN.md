# DepRadar — Sprint 6 Architecture & Implementation Plan

# Predictive Engineering Intelligence (Evidence-Backed Forecasting)

## 1. Architectural Context & System Topology

DepRadar evolves from:
$$\text{OBSERVE} \longrightarrow \text{DETECT} \longrightarrow \text{INVESTIGATE} \longrightarrow \text{RESOLVE} \longrightarrow \text{LEARN} \longrightarrow \text{ANTICIPATE}$$

### Intelligence Hierarchy & Reused Canonical Systems

```
Filesystem Events
       │
       ▼
Observation Engine (Daemon)
       │
       ▼ (PostgreSQL authoritative source of truth)
development_events & sessions
       │
       ▼
Event Analysis (AST, Code Evolution, Security Guardian)
       │
       ▼
┌───────────────────────────────┬────────────────────────────────┐
│ Security Intelligence 2.0     │ Project Intelligence & DNA     │
│ (Posture, Findings, Sensitive)│ (Rhythms, Focus, Surface)      │
└───────────────┬───────────────┴────────────────┬───────────────┘
                │                                │
                ▼                                ▼
       Investigation Engine 3.0 & Incident Resolution
       (Evidence Graph, Review Lifecycle, Audit Trail)
                │
                ▼
       Predictive Engineering Intelligence (Sprint 6)
       (Deterministic Signal Engine, Hotspots, Recurrence, Forecasts)
                │
                ├── Dashboard: Predictive Engineering Center
                ├── Investigation Deep-Links (Forecast -> Investigate)
                └── Project Context Memory (PROJECT_CONTEXT.md)
```

---

## 2. Canonical Infrastructure Reuse (No Duplication)

| Capability                      | Canonical Source                                                                             | How Sprint 6 Reuses It                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Authoritative Telemetry**     | PostgreSQL tables `development_events`, `sessions`, `event_analyses`                         | Consumed as primary evidence for event acceleration and session frequency.            |
| **Security Posture & Findings** | `apps/api/app/features/security_intelligence/` (`get_or_create_security_intelligence`)       | Consumed for security recurrence, sensitive surface exposure, and rule counts.        |
| **Project Context & Focus**     | `apps/api/app/features/project_context/` (`get_or_create_project_context`)                   | Consumed for primary directories, languages, framework context, and context markdown. |
| **Engineering DNA**             | `apps/api/app/features/engineering_dna/` & `apps/api/app/features/projects/service.py`       | Consumed for file modification history, focus drift, and subsystem classifications.   |
| **Incident Reviews & History**  | `apps/api/app/features/investigation/` (`incident_review_states`, `incident_review_history`) | Consumed for resolution regression (e.g., previously resolved rule re-appearing).     |
| **Secret Redaction**            | `app.features.project_context.export.redact_sensitive_text`                                  | Applied across all prediction summaries, titles, evidence strings, and API responses. |
| **WebSocket Updates**           | `app.core.websocket.connection_manager`                                                      | Broadcasts `PREDICTIONS_UPDATED` on demand.                                           |

---

## 3. Deterministic Signal & Forecast Engine

The Predictive Intelligence layer is **100% deterministic and evidence-backed**. No artificial confidence percentages or fabricated ML hallucinations.

### 3.1 Signals Detected

1. **Activity Acceleration**:
   - Compares event count in the recent observation window (last 3-7 days) against historical baseline rate.
   - Evidence includes: `baseline_rate_per_day`, `recent_rate_per_day`, `delta_percentage`, `event_counts`.
2. **Security Recurrence**:
   - Tracks security rule detections over time windows. Identifies rules (`SEC001`, `DEBUG_TRUE`, `PERMISSIVE_CORS`, etc.) that recur in subsequent sessions.
   - Evidence includes: `rule_id`, `occurrence_count`, `first_seen`, `last_seen`, `affected_files`.
3. **Engineering Hotspot Concentration**:
   - Evaluates files and subsystems using composite metrics: modification frequency + security findings count + incident involvement + recent burst factor.
   - Hotspot Score: $0 \le \text{Score} \le 100$ with additive breakdown explanation.
4. **Incident Recurrence**:
   - Evaluates correlated incidents affecting the same subsystem or rule within rolling time windows.
5. **Resolution Regression**:
   - Cross-references `IncidentReviewHistory` where an incident with a given rule was transitioned to `RESOLVED`, but new events trigger findings under the same rule in the same project.
6. **Engineering Focus Drift**:
   - Compares previous session activity distribution (e.g., UI/Frontend) against recent session activity distribution (e.g., Auth/API/Database).
7. **Sensitive Surface Expansion**:
   - Detects increasing proportion of development events touching security-sensitive files (`auth`, `config`, `settings`, `.env`, credentials).

---

## 4. Forecasting Model & Additive Scoring

### Prediction Entity Schema

```json
{
  "prediction_id": "pred-sprint6-auth-hotspot",
  "project_id": "uuid",
  "prediction_type": "ENGINEERING_HOTSPOT",
  "title": "Authentication subsystem is intensifying as an engineering hotspot",
  "summary": "Rapid changes in auth.py coupled with 3 security findings indicate high change velocity in a critical security surface.",
  "severity": "HIGH",
  "forecast_score": 82,
  "evidence_strength": "STRONG",
  "time_horizon": "SHORT_TERM",
  "contributing_signals": [
    "Activity acceleration (+45%)",
    "Security rule recurrence (SEC001 x2)",
    "Sensitive surface touch"
  ],
  "score_breakdown": {
    "activity_acceleration": 25,
    "security_recurrence": 30,
    "sensitive_surface_factor": 15,
    "resolution_regression": 12
  },
  "affected_files": ["src/auth.py", "config/settings.py"],
  "affected_subsystems": ["Authentication", "Configuration"],
  "historical_window_days": 14,
  "recommended_action": "Review auth.py code changes and ensure credentials remain in environment vault.",
  "investigation_incident_id": "inc-sprint5-1",
  "provenance": "OBSERVED"
}
```

### Evidence Strength Levels

- **`STRONG`**: Multiple independent signals across distinct sessions (e.g. repeated findings + acceleration + resolution regression).
- **`MODERATE`**: Two independent historical signals observed.
- **`LOW`**: Emerging trend with limited historical baseline events.

---

## 5. Extensibility: Future ML Provider Interface

To maintain production design hygiene without installing bloated ML libraries, the system introduces a pluggable provider interface:

```python
class PredictiveSignalProvider(ABC):
    @abstractmethod
    async def generate_predictions(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> list[PredictiveSignal]:
        ...

class DeterministicPredictiveProvider(PredictiveSignalProvider):
    """Production default: 100% deterministic, evidence-backed rules engine."""
```

Future providers (e.g., local inference, time-series forecasting) can implement this interface without modifying the core domain or database schema.

---

## 6. Strict Invariants

1. **Reconstructibility**: Predictions are derived projections from PostgreSQL telemetry and can be cleared and recomputed with 100% semantic equivalence ($A \equiv B$).
2. **Zero Secret Leakage**: Controlled test string `VIBEPULSE_SPRINT6_SECRET_2026` is redacted to `[REDACTED]` in all predictions, logs, JSON responses, and markdown exports.
3. **Multi-Project Isolation**: Scoped strictly by `project_id`. Deleting Project A completely cascades without affecting Project B.
