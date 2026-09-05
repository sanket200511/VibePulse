# DepRadar Trust, Explainability & Evidence Intelligence

## 1. Overview & Vision

The central product question of Sprint 9 is:

$$\mathbf{"\text{WHY DOES VIBEPULSE BELIEVE THIS?}"}$$

DepRadar does not fabricate heuristic scores or opaque AI confidence percentages. Every health grade, security violation, incident correlation, predictive forecast, and recommended priority is directly grounded in concrete, empirical PostgreSQL telemetry and deterministic rule chains.

---

## 2. Universal Evidence & Provenance Model

Every piece of intelligence in DepRadar carries an explicit **Provenance Tag**:

| Provenance Tag   | Definition                                                                                                  | Example                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **`[OBSERVED]`** | Directly supported by raw PostgreSQL telemetry or persisted human decisions.                                | File modified timestamp, line diff, AST rule trigger, human review status transition. |
| **`[INFERRED]`** | Deterministically synthesized from observed evidence using closed-form mathematical equations or AST rules. | Dimensional health score, composite health grade, hotspot concentration index.        |
| **`[UNKNOWN]`**  | Explicitly unestablished due to insufficient baseline telemetry. Never guessed.                             | Project with 0 sessions (`INSUFFICIENT_EVIDENCE`), unobserved production topology.    |

---

## 3. Mathematical Score Decomposition

Project Health is not a black box. The overall score ($S_{\text{overall}}$) is computed via an explicit linear combination of 5 dimensions:

$$S_{\text{overall}} = 0.25 \times S_{\text{sec}} + 0.20 \times S_{\text{eng}} + 0.20 \times S_{\text{inc}} + 0.15 \times S_{\text{res}} + 0.20 \times S_{\text{pred}}$$

### Example Breakdown:

- **Security Health (25%)**: $52 \times 0.25 = \mathbf{+13.0}$
- **Engineering Stability (20%)**: $90 \times 0.20 = \mathbf{+18.0}$
- **Incident Health (20%)**: $61 \times 0.20 = \mathbf{+12.2}$
- **Resolution Health (15%)**: $82 \times 0.15 = \mathbf{+12.3}$
- **Predictive Risk Health (20%)**: $62 \times 0.20 = \mathbf{+12.4}$
- **Total Composite Score**: $13.0 + 18.0 + 12.2 + 12.3 + 12.4 = 67.9 \longrightarrow \mathbf{68/100}$ (Grade: **`HEALTHY`**)

---

## 4. Causal Evidence Chains

When an engineer inspects any conclusion, DepRadar reveals the exact chronological chain of evidence:

```
[ 1. FILE_MODIFIED ]
      ↓
[ 2. SECURITY_ANALYSIS (AST Guardian: SEC001) ]
      ↓
[ 3. RISK_CONTRIBUTION (+50 pts) ]
      ↓
[ 4. SECURITY_HEALTH IMPACT (100 - 50 = 50/100) ]
      ↓
[ 5. UNIFIED PROJECT HEALTH DECOMPOSITION ]
      ↓
[ 6. PRIORITY #1: SECURITY_REMEDIATION ]
```

---

## 5. Security & Redaction Guarantees

1. **Zero Raw Secret Exposure**: Sensitive tokens (e.g. `VIBEPULSE_SPRINT9_SECRET_2026`, API keys, passwords) are automatically masked with `[REDACTED]` across database analyses, API endpoints, WebSocket messages, UI components, logs, and markdown exports.
2. **Multi-Project Isolation**: Evidence chains and telemetry are strictly isolated by project ID and root path.
3. **100% Deterministic Reconstructibility**: Given the canonical PostgreSQL events, the evidence state is a pure projection ($A \equiv B$).
