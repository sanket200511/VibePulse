# VORTEX — HACKATHON JUDGES DEMONSTRATION RUNBOOK

## High-Impact, End-to-End Real-World Engineering Intelligence Walkthrough

> **Operator Note**: This runbook is designed for the developer manually operating the VORTEX browser interface (`http://localhost:5183`) in front of the hackathon judging panel. All underlying telemetry, AST analysis, Random Forest ML secret classification, incident correlation, and test verifications were executed natively on the local filesystem and backend.

---

### 1. One-Line Project Pitch

> **"VORTEX transforms raw, continuous software development activity into deterministic, evidence-backed engineering intelligence — understanding not just what changed, but why it matters, what caused it, and what will happen next."**

---

### 2. The Demo Story

1. **Normal Flow**: A developer is building **VortexShop** (an order processing, authentication, and payment settlement service). All tests pass.
2. **The Accident**: During a rushed integration of the external payment settlement gateway, the developer accidentally commits a hardcoded high-entropy API key (`PAYMENT_GATEWAY_TOKEN`) and enables `DEBUG = True` in configuration.
3. **VORTEX Awakens**: Without needing manual CI trigger or git commit, VORTEX’s local telemetry daemon captures the filesystem mutation. The AST parser extracts assignment candidates, and the ML Random Forest model (`rf-secret-classifier`) classifies the candidate with 100% confidence as `REAL_SECRET`.
4. **Causal Correlation**: VORTEX correlates the credential finding (`SEC-ML-001`) with the configuration change, grouping affected files (`src/payments.py`, `config/settings.py`) into a correlated incident.
5. **Investigation & Remediation**: The developer investigates, adds diagnostic logging, removes the hardcoded credential in favor of secure runtime environment variables, disables debug mode, and writes a security regression test.
6. **Verification & Post-Fix**: The developer runs `pytest` (9/9 tests pass). VORTEX observes the remediation, lowers the risk score, records the resolution, learns the engineering DNA, and forecasts future hotspot risk.
7. **Interactive Dialogue**: The judges ask VORTEX probing questions via the AI Engineering Copilot. VORTEX answers strictly within its **Truth Boundary** (OBSERVED vs INFERRED vs UNKNOWN) and refuses to hallucinate facts without empirical evidence.

---

### 3. What the Developer Does (Behind the Scenes)

| Step   | Action                         | Files Touched                                                                     | Tests State            |
| :----- | :----------------------------- | :-------------------------------------------------------------------------------- | :--------------------- |
| **01** | Create healthy baseline        | `src/auth.py`, `src/orders.py`, `src/database.py`, `config/settings.py`           | 4 passed               |
| **02** | Add payment gateway & docs     | `src/payments.py`, `docs/architecture.md`, `tests/test_payments.py`               | 6 passed               |
| **03** | Rushed integration ("Oh shit") | Hardcode `sk_live_...` in `src/payments.py`, `debug=True` in `config/settings.py` | 6 passed (silent risk) |
| **04** | Feature work continues         | Add order cancellation in `src/orders.py`, update `tests/test_orders.py`          | 7 passed               |
| **05** | Investigation                  | Add audit log in `src/payments.py`                                                | 7 passed               |
| **06** | Remediation                    | Retrieve token from `os.getenv()`, restore `debug=False`, add regression test     | 8 passed               |
| **07** | Post-fix enhancement           | Add webhook HMAC-SHA256 signature verification in `src/payments.py` & tests       | 9 passed               |
| **08** | Live observability touch       | Update system status in `README.md` right before hand-off                         | 9 passed               |

---

### 4. What VORTEX Observes (Telemetry Pipeline)

- **WatchManager & Observation Gate**: Monitored `D:\VORTEX-HACKATHON-DEMO` without polling.
- **Debouncer**: Coalesced rapid write events into coherent logical development increments.
- **AST Candidate Extractor**: Scanned Python AST for assignment targets and string literals.
- **Deterministic & ML Classifier**: Filtered non-secrets; passed candidate `sk_live_...` to Random Forest classifier (`features: entropy=4.82, length=43, alpha_ratio=0.74, charset_type=hex_prefixed`). Model assigned 100% confidence.
- **Redaction Filter**: Enforced strict `[REDACTED]` invariant on the token across telemetry, findings, incidents, and Copilot context.
- **Correlator**: Bound the finding to affected files, creating a unified development incident.
- **Causality & Knowledge Graph**: Linked `Project → Session → File → Finding → Incident → Resolution`.

---

### 5. Exact Browser Navigation Path

```
1. http://localhost:5183
   └── Select Project: "VORTEX-HACKATHON-DEMO"
       ├── Tab 1: "Dashboard" (Overview, Health Grade, Active Session)
       ├── Tab 2: "Security Intelligence" (Findings, ML Confidence, Risk Explanation)
       ├── Tab 3: "Investigation" (Correlated Incident, Affected Surface, Story)
       ├── Tab 4: "Timeline & Activity" (Live Development Timeline, Session Stream)
       ├── Tab 5: "Knowledge Graph" (Causality Graph, Node Inspector)
       ├── Tab 6: "Predictive Intelligence" (Hotspots, Future Risk Forecast)
       └── Tab 7: "Copilot" (Interactive Grounded QA with Provenance)
```

---

### 6. What to Say on Each Screen (Scripted Narrative)

#### Screen 1: Dashboard (`/`)

- **Action**: Select `VORTEX-HACKATHON-DEMO` from the project dropdown.
- **Script**:
  > _"Judges, what you see here is VORTEX observing an active e-commerce application named VortexShop. Unlike static linters or post-mortem vulnerability scanners, VORTEX operates as an always-on engineering intelligence system. Notice the live session with over 30 real filesystem events captured seamlessly as the developer worked. The health grade and metrics reflect real-time code evolution."_

#### Screen 2: Security Intelligence (`/security`)

- **Action**: Click on the Security Intelligence tab. Highlight the finding `SEC-ML-001`.
- **Script**:
  > _"Here is the turning point of our story. During a payment gateway integration, the developer accidentally introduced a high-entropy API key. Watch what VORTEX did: our deterministic engine extracted the assignment, and our Random Forest ML classifier evaluated the Shannon entropy and structure, tagging it with 100% confidence as a `REAL_SECRET`. Look closely at the evidence: the actual secret is strictly masked as `[REDACTED]`. It never leaks to logs, databases, or UI."_

#### Screen 3: Investigation 3.0 (`/investigation`)

- **Action**: Click on the Correlated Incident in the list.
- **Script**:
  > _"A single security alert doesn't tell you the story. VORTEX’s Investigation Engine connects the dots. It correlates `src/payments.py` with `config/settings.py`, traces the exact sequence of modifications, maps the affected attack surface, and links it directly to the engineering session. It generates an evidence-backed incident narrative explaining what happened and why it matters."_

#### Screen 4: Timeline (`/timeline`)

- **Action**: Scroll through the chronological event sequence.
- **Script**:
  > _"Here is the complete chronological development story: Baseline creation → Payment feature addition → Accidental vulnerability introduction → Developer investigation → Remediation with safe environment variables → Regression test addition. Notice that development continued naturally after the problem — VORTEX maintains continuity across the entire lifecycle."_

#### Screen 5: Knowledge Graph (`/graph`)

- **Action**: Click on the `payments.py` node or the incident node to reveal connected edges.
- **Script**:
  > _"VORTEX constructs a real-time Knowledge and Causality Graph. Rather than a flat list of files, VORTEX maps dependencies, developer touchpoints, findings, and resolutions into an interconnected topology of project health."_

#### Screen 6: Predictive Intelligence (`/predictions`)

- **Action**: Show Hotspots and Risk Factors.
- **Script**:
  > _"Now VORTEX looks forward. Because `payments.py` and `settings.py` underwent multiple churn cycles and security remediation, VORTEX identifies `src/payments.py` as a high-churn hotspot and predicts potential regression risk for future payment releases. It tells the team what to worry about before the next incident happens."_

#### Screen 7: Copilot (`/copilot`)

- **Action**: Ask the prepared questions sequentially in the Copilot prompt.
- **Script**:
  > _"Finally, let's talk to VORTEX. VORTEX is not a generic LLM that hallucinates answers. Every response is passed through an Answerability Gate and partitioned into three strict truth boundaries: OBSERVED facts, INFERRED hypotheses, and UNKNOWN gaps."_

---

### 7. Copilot Questions & Expected Evidence

#### Question 1: Project Knowledge

- **Query**: `"What do you know about this project?"`
- **Expected Evidence**:
  - **OBSERVED**: Identifies `VORTEX-HACKATHON-DEMO` as an e-commerce order and payment settlement service with core modules (`auth.py`, `orders.py`, `payments.py`, `settings.py`).
  - **INFERRED**: Python backend architecture with in-memory persistence and external payment gateway integration.

#### Question 2: Recent Activity

- **Query**: `"What changed recently?"`
- **Expected Evidence**:
  - **OBSERVED**: Cites recent modifications to `src/payments.py`, `tests/test_payments.py`, and `README.md`. 9 unit tests passing.

#### Question 3: Observed Security Issues

- **Query**: `"What security issues have actually been observed?"`
- **Expected Evidence**:
  - **OBSERVED**: Cites rule `SEC-ML-001` in `payments.py` (High-Entropy Credential Exposure) detected via Random Forest ML classifier. Shows evidence masked as `[REDACTED]`.
  - **INFERRED**: Credential represented an external payment gateway token.

#### Question 4: Incident Causality & Resolution

- **Query**: `"What caused the incident and how was it resolved?"`
- **Expected Evidence**:
  - **OBSERVED**: Direct assignment of synthetic token to `PAYMENT_GATEWAY_TOKEN` during rushed integration. Resolved by replacing assignment with `os.getenv("PAYMENT_GATEWAY_TOKEN", "")` and adding `test_no_hardcoded_token_in_source`.

#### Question 5: Predictive Risk

- **Query**: `"What are the current engineering risks and what should I work on next?"`
- **Expected Evidence**:
  - **OBSERVED / INFERRED**: Recommends monitoring `src/payments.py` due to recent high churn, verifying runtime environment secrets in production deployment, and adding integration tests for the settlement webhook.

#### Question 6: Truth Boundary & Exploitation (The Killer Demo Moment)

- **Query**: `"Is there enough evidence to conclude that the issue was actually exploited?"`
- **Expected Behavior**:
  - **UNKNOWN / REFUSAL**: VORTEX explicitly states: _"There is NO telemetry evidence in repository history to indicate that the credential was accessed or exploited by an external party."_
  - **Judges Impact**: Demonstrates that VORTEX has a strict Answerability Gate and does not hallucinate false claims.

#### Question 7: Unanswerable Out-of-Scope Query

- **Query**: `"What is the weather in San Francisco today?"`
- **Expected Behavior**:
  - `answerable: false`. VORTEX cleanly indicates the query is outside engineering repository intelligence.

---

### 8. Expected Empirical Evidence Table

| Attribute            | Real Observed Result                    | Inferred / Status                |
| :------------------- | :-------------------------------------- | :------------------------------- |
| **Project ID**       | `UUID` generated at registration        | Confirmed active in PostgreSQL   |
| **Watch Root**       | `D:\VORTEX-HACKATHON-DEMO`              | Monitored by daemon on port 5185 |
| **Test Suite**       | 9 passed in `0.02s` via `pytest`        | 100% verified locally            |
| **ML Model**         | `rf-secret-classifier` (v1.0.0)         | Confidence: 1.0 (REAL_SECRET)    |
| **Secret Redaction** | `sk_live_...` masked as `[REDACTED]`    | 0 raw secrets persisted          |
| **Incident Title**   | "Password / Credential Exposure"        | Correlated with 20+ events       |
| **Affected Surface** | `src/payments.py`, `config/settings.py` | Subsystem: `payments` & `config` |

---

### 9. Truth-Boundary Moments

1. **The Synthetic Secret**:
   - VORTEX records the pattern as an **OBSERVED** finding with line number and masked evidence.
   - The ML classification is flagged with `truth_state: INFERRED` because it represents a probabilistic prediction.
2. **Exploitation Boundary**:
   - When asked if an attacker stole customer data, VORTEX places this under **UNKNOWN** because filesystem and code telemetry cannot prove external network exploitation without external server access logs.

---

### 10. Backup Plan (If Telemetry is Delayed)

1. **If Daemon is Paused**: In terminal or via curl, send `POST http://127.0.0.1:5185/control/observe/start` to ensure the Observation Gate is open.
2. **If Background Tasks are Queued**: Force immediate re-indexing by clicking the "Refresh" icon on the Project Context or Predictions page, or sending:
   ```bash
   curl -X POST http://127.0.0.1:5184/api/projects/<PROJECT_ID>/context/refresh
   curl -X POST http://127.0.0.1:5184/api/projects/<PROJECT_ID>/predictions/refresh
   ```
3. **If Pytest Cache Interrupted**: Run `uv run --directory apps/api pytest D:\VORTEX-HACKATHON-DEMO\tests` directly in terminal.

---

### 11. Final 30-Second Closing Pitch

> _"Judges, every engineering team struggles with the gap between what developers write in code and what teams understand about risk. Traditional tools only alert on static snapshots. VORTEX understands software development as it happens — connecting changes, explaining causality, enforcing truth boundaries, and predicting future failure before it strikes. VORTEX turns raw development activity into actionable engineering intelligence."_
