# VibePulse — High-Impact Live Judges Demonstration Runbook

> **Audience:** Presenter / Developer conducting live hackathon or seminar demonstration in front of judges.  
> **Mode:** Manual browser operation by human presenter; 100% real observed development telemetry in backend.

---

## 1. Demo Objective & Value Proposition

VibePulse is not a static code linter or passive dashboard. It is a continuous **Engineering Intelligence & Observability System** that watches software as it is being written, understands causality, isolates regressions and credential leaks using hybrid machine learning, tracks remediation history, predicts engineering hotspots, and answers complex developer questions grounded strictly in verifiable facts.

### Core Philosophy: The Truth Boundary

- **`[OBSERVED]`**: Verifiable, directly observed syntactic events, file modifications, git branches, and deterministic rule triggers.
- **`[INFERRED]`**: Machine learning classifications (e.g., Random Forest secret probabilities, code churn risk models, health dimension scores).
- **`[UNKNOWN]`**: Inconclusive context, external data not visible to local telemetry, or missing historical triage records.

---

## 2. Demonstration Project Details

- **Project Display Name:** `VORTEX-2026-Demo`
- **Canonical Filesystem Path:** `D:\VORTEX-2026-Demo`
- **Domain:** High-Frequency Order Matching, Authentication, and Settlement API (FastAPI, Python).
- **Project ID:** `78b7a0c8-9daa-4165-a9fa-f8ba2ed9e759`
- **Architecture:**
  - `src/main.py` & `src/api.py`: FastAPI endpoints for orders and settlement.
  - `src/auth.py`: JWT token verification and claims validation.
  - `src/payments.py`: Settlement gateway and webhook signature validator.
  - `src/orders.py`: Order state machine and notional calculation.
  - `src/database.py`: In-memory persistence client.
  - `config/settings.py`: Typed environment configuration.
  - `tests/`: Pytest test suite (all 7 unit tests passing).

---

## 3. The 17-Step Engineering Narrative Arc

```
1. PROJECT BASELINE (Healthy Order & Auth Service)
       ↓
2. NORMAL DEVELOPMENT (Payment Gateway Integration)
       ↓
3. SECURITY / QUALITY REGRESSION (Accidental Hardcoded Secret & Debug Mode)
       ↓
4. VIBEPULSE OBSERVES (Daemon Streams Events to API)
       ↓
5. HYBRID DETECTION (AST Rule SEC001 + Random Forest ML SEC-ML-001)
       ↓
6. UNDERSTANDING (Risk Explanation: +210 points, Degraded Health)
       ↓
7. INVESTIGATION (Developer Adds Diagnostic Logging & Inspects Code)
       ↓
8. ROOT CAUSE (Exposed Credential in src/payments.py line 10)
       ↓
9. REMEDIATION (Environment Variable Externalization & Strict Debug Check)
       ↓
10. VERIFICATION (Pytest Regression Suite: 7 passed in 0.14s)
       ↓
11. POST-REMEDIATION DEVELOPMENT (Webhook Signature & Idempotency)
       ↓
12. TIMELINE REPLAY (Complete Before / During / After Activity)
       ↓
13. PREDICTIONS (Hotspots Identified: Configuration & Sensitive Subsystems)
       ↓
14. COPILOT GROUNDING (Evidence-backed Q&A with Provenance Badges)
       ↓
15. ANSWERABILITY GATE (Safe Out-of-Scope Query Rejection)
       ↓
16. KNOWLEDGE GRAPH (Project → Sessions → Files → Finding Nodes Connected)
       ↓
17. FINAL PROJECT HEALTH (Observable, Restored Architecture)
```

---

## 4. Recommended Browser Navigation Flow

1. **Dashboard Home (`http://localhost:5183/`)**:
   - Show the Projects list. Point out `VORTEX-2026-Demo`.
   - Highlight the Live Status badge: `Healthy`, active telemetry connection.
2. **Project Overview & Story (`/projects/78b7a0c8-9daa-4165-a9fa-f8ba2ed9e759`)**:
   - Walk through the **Unified Project Health Score** breakdown:
     - _Engineering Stability:_ 100/100 (Optimal)
     - _Resolution Health:_ 100/100 (Optimal)
     - _Security Health:_ Reflects observed incidents
   - Show the observation timeline with real commit and file change timestamps.
3. **Security Command Center (`/projects/.../security`)**:
   - Point out **Correlated Incident**: _Password / Credential Exposure (10 correlated events)_ across `settings.py`, `auth.py`, `payments.py`.
   - Open finding modal for `SEC-ML-001`:
     - Show **Detection Source:** `ml` (Hybrid ML Engine)
     - Show **Model:** `rf-secret-classifier` (v1.0.0, 100% confidence)
     - Highlight strict invariant: raw secret is **`[REDACTED]`**; no secret leaked into UI or database!
4. **Investigation & Correlation Graph (`/projects/.../investigation`)**:
   - Filter by `payments.py` or query `credential`.
   - Show how VibePulse connects the developer's edit sequence:
     `payments.py (created) → payments.py (secret introduced) → payments.py (investigated) → payments.py (remediated)`.
5. **Knowledge Graph (`/projects/.../knowledge-graph`)**:
   - Switch between **General / Investigation / Impact / Memory** perspectives.
   - Adjust Depth filters (1, 2, 3, All).
   - View connected file and session clusters.
6. **Predictive Intelligence (`/projects/.../predictions`)**:
   - Show proactive signals: _Configuration & Environment Hotspot_ and _Recurrence Risk: SEC001_.
   - Explain how VibePulse predicts risk before code reaches staging.
7. **AI Engineering Copilot (`/projects/.../copilot`)**:
   - Ask the prepared grounding questions below.

---

## 5. Copilot Demonstration Questions & Grounded Evidence

### Question 1 (Project Memory)

> **"What do you know about this project?"**

- **Expected Result:** Summarizes `VORTEX-2026-Demo` with 42 real events, Python stack, and authentication/order modules.
- **Talking Point:** _"Copilot is not a generic chatbot. It queries VibePulse's canonical PostgreSQL memory."_

### Question 2 (Recent Changes)

> **"What changed recently in the repository?"**

- **Expected Result:** Details recent updates to `src/payments.py`, `config/settings.py`, and `docs/architecture.md`.

### Question 3 (Security Signals)

> **"What security issues have been observed?"**

- **Expected Result:** Reports rule `SEC001` (Settings configuration exposure) and `SEC-ML-001` (High-entropy credential detected by Random Forest ML classifier).
- **Talking Point:** _"Notice the `[OBSERVED]` badges for syntactic matches and `[INFERRED]` for ML predictions."_

### Question 4 (Root Cause Analysis)

> **"What caused the most important issue?"**

- **Expected Result:** Identifies the hardcoded credential string introduced during the payment gateway integration.

### Question 5 (Remediation Verification)

> **"How was the issue resolved?"**

- **Expected Result:** Identifies that `src/payments.py` was remediated to use `os.getenv("PAYMENT_GATEWAY_TOKEN")` and regression tests were added.

### Question 6 (Predictive Engineering Risks)

> **"What are the current engineering risks?"**

- **Expected Result:** Lists predictive signals regarding configuration churn and credential recurrence risks.

### Question 7 (Actionable Guidance)

> **"What should I work on next?"**

- **Expected Result:** Recommends reviewing environment variable handling and setting up automated pre-commit secret scans.

### Question 8 (Answerability Gate & Safety)

> **"What is the weather today in New York?"**

- **Expected Result:** **`Answerable: False`**. _"The query asks for information outside observed telemetry domain... Please ask about project health, security findings, or active incidents."_
- **Talking Point:** _"Unlike standard LLMs, VibePulse includes an Answerability Gate. It refuses to hallucinate out-of-scope data."_

---

## 6. Real Observed State vs. Expected UI State

| Intelligence Metric      | Real Observed Backend State              | Expected UI Location         |
| :----------------------- | :--------------------------------------- | :--------------------------- |
| **Observation Events**   | 42 real filesystem events                | Timeline / Session Drawer    |
| **Sessions**             | 1 continuous observation session         | Navigation & Live Status Bar |
| **Knowledge Graph**      | 50 nodes, 66 edges                       | Knowledge Graph Page         |
| **Correlated Incidents** | 1 Critical Incident (10 events, 4 files) | Security Command Center      |
| **Active Findings**      | 4 findings (AST + ML hybrid)             | Security Finding Table       |
| **Secret Redaction**     | Strict `[REDACTED]` invariant verified   | Findings Details Modal       |
| **Prediction Signals**   | 4 active forecast signals                | Predictive Intelligence Page |
| **Regression Tests**     | 7 passed in 0.14s                        | Terminal / CI status         |

---

## 7. Troubleshooting & Recovery (If Needed During Demo)

If you need to refresh data or reset the demo state before judges arrive:

1. **Re-run the Automated Demo Scenario:**

   ```powershell
   node scripts/run-judges-demo.mjs
   ```

   _Execution time: ~25 seconds. Replays the full 7-phase story automatically._

2. **Verify Daemon Observation:**

   ```powershell
   curl -s http://localhost:5185/health
   ```

   _Confirm `"observing": true` and `"root": "D:\\VORTEX-2026-Demo"`._

3. **Verify API Health & ML Status:**
   ```powershell
   curl -s http://localhost:5184/health
   curl -s http://localhost:5184/api/projects/78b7a0c8-9daa-4165-a9fa-f8ba2ed9e759/security/ml-status
   ```
