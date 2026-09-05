# Security Intelligence 2.0 — Architecture & Operational Guide

## Overview

**Security Intelligence 2.0** upgrades DepRadar from basic secret detection into a continuous, evidence-backed security posture and risk correlation engine.

It transforms developer activity and static telemetry into actionable security understanding:

```
REAL PROJECT FILESYSTEM
         │
         ▼
OBSERVATION ENGINE (Daemon)
         │
         ▼
FASTAPI BACKEND & EVENT STORE (PostgreSQL)
         │
         ├──► ANALYSIS PIPELINE (Security Guardian + Dangerous Code + Config + Auth Analyzers)
         │           │
         │           ▼
         │    event_analyses (PostgreSQL)
         │
         ▼
SECURITY INTELLIGENCE ENGINE (Pure Deterministic Projection)
  - Security Posture (Critical / High / Medium / Low)
  - Sensitive File Intelligence & Tracking
  - Dangerous Code Pattern Analysis & Remediation
  - Authentication Architecture Signals
  - Configuration Risks
  - Dependency Inventory Foundation
  - 7-Day Security Activity & Trend
  - Explainable Additive Risk Scoring 2.0
  - Security Incident Correlation
         │
         ├──► INVESTIGATION ENGINE & EVIDENCE GRAPH 2.0 (Deep incident causality)
         ├──► PROJECT CONTEXT & PROJECT_CONTEXT.md EXPORT (Secret-safe AI handoff)
         └──► DASHBOARD: SECURITY COMMAND CENTER & FINDINGS INSPECTOR
```

---

## Core Invariants

1. **Deterministic & Evidence-Backed**: Every metric, finding, incident, and score is computed strictly from PostgreSQL historical tables (`development_events`, `sessions`, `event_analyses`) and filesystem manifests. No fabricated CVEs or pseudo-ML probabilities are ever created.
2. **Strict Pre-Persistence Secret Redaction**: Raw secret credentials never enter the database, JSONB columns, API responses, WebSocket broadcasts, logs, or exports. Redaction happens before persistence.
3. **Derived Projection & 100% Reconstructibility**:
   - `development_events`, `sessions`, and `event_analyses` remain the immutable source of truth.
   - Deleting the security intelligence cache and recalculating produces a 100% semantically equivalent projection.
   - Modifying detector logic never destroys historical telemetry.
4. **Project Isolation**: Telemetry and security findings from Project A are strictly isolated and never leak to Project B.

---

## Explainable Additive Risk Scoring Model

The risk score ($0 - 100$) is computed with explicit additive weights:

| Category             | Contributing Signal                                                                                      | Score Addition             | Max Cap |
| -------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------- | ------- |
| **Credentials**      | Hardcoded API keys, tokens, cloud credentials (`SEC001`, `AWS_SECRET`, `PRIVATE_KEY`)                    | $+50$ per finding          | $50$    |
| **Dangerous Code**   | Dynamic execution & deserialization (`eval()`, `exec()`, `os.system()`, `pickle.loads()`, `yaml.load()`) | $+25$ to $+30$ per finding | $35$    |
| **Configuration**    | Insecure transport / settings (`DEBUG=True`, `allow_origins=["*"]`, `verify=False`)                      | $+15$ per finding          | $20$    |
| **Authentication**   | Active modifications to authentication routines (`auth.py`, `jwt.ts`, token middleware)                  | $+5$ per event             | $15$    |
| **Sensitive Files**  | Changes to `.env*`, `settings.py`, database configurations                                               | $+3$ per event             | $10$    |
| **Activity Pattern** | High frequency modification bursts on sensitive files                                                    | $+7$                       | $7$     |

### Risk Level Thresholds

- **CRITICAL**: Score $\ge 80$ or active critical credential finding
- **HIGH**: Score $\ge 60$
- **MEDIUM**: Score $\ge 30$
- **LOW**: Score $< 30$

---

## Incident Correlation Engine

Individual events and findings occurring within a $15$-minute sliding window and sharing the same session or sensitive files are grouped into **Correlated Security Incidents**.

Each incident includes:

- Incident Title & Severity
- Composite Risk Score
- Correlated Events Count
- Affected Files List
- Contributing Findings & Secret-Safe Redacted Evidence
- Deep Link to Investigation Engine for causal replay

---

## Security Guardian Rules

- `SEC001`: Credential & Secret Exposure (API keys, passwords, database URLs, tokens)
- `HARDCODED_OPENAI_KEY`: Hardcoded OpenAI API keys (`sk-[REDACTED]`)
- `AWS_SECRET`: AWS Access Keys / Secret Keys
- `PRIVATE_KEY`: Private cryptographic keys (`BEGIN PRIVATE KEY`)
- `EVAL_USAGE`: Dynamic `eval()` execution
- `EXEC_USAGE`: Dynamic `exec()` execution
- `SUBPROCESS_SHELL_TRUE`: Subprocess with `shell=True`
- `PICKLE_LOADS`: Unsafe Python pickle deserialization
- `YAML_UNSAFE_LOAD`: Unsafe PyYAML loading without `SafeLoader`
- `OS_SYSTEM`: System command execution via `os.system()`
- `MD5_USAGE` & `SHA1_USAGE`: Weak legacy hashing algorithms
- `VERIFY_FALSE`: Disabled TLS certificate verification
- `DEBUG_TRUE`: Enabled framework debug mode in configuration
- `PERMISSIVE_CORS`: Permissive wildcard CORS (`allow_origins=["*"]`)
- `TODO_SECURITY`: Unresolved security debts and markers

---

## ML Extension Provider Interface

The system defines a clean abstract provider:

```python
class SecuritySignalProvider(ABC):
    @abstractmethod
    def analyze_signals(self, events, observed_files, event_analyses, project_root):
        ...
```

- `RuleBasedSecurityProvider`: Fully active deterministic engine.
- `MLSecuritySignalProvider`: Extensible interface for future statistical/neural anomaly detection against project Engineering DNA.

---

## API Endpoints

- `GET /api/projects/{project_id}/security` — Retrieve current Security Intelligence projection.
- `POST /api/projects/{project_id}/security/refresh` — Force reprojection from PostgreSQL historical telemetry.
- `GET /api/projects/{project_id}/security/incidents` — Retrieve active correlated incidents.
