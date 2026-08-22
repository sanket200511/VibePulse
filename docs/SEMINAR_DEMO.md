# VibePulse — Seminar Live Demonstration Script (5-Minute Runbook)

---

## Pre-Seminar Verification (1 Minute Before Going on Stage)

Run the seminar diagnostic tool:
```bash
node scripts/seminar-doctor.mjs
```
**Expected Output**:
```
[PASS] [✓] Node.js Runtime (v22.x)
[PASS] [✓] pnpm Package Manager (9.x)
[PASS] [✓] Python / uv Toolchain
[PASS] [✓] PostgreSQL Server (:5432)
[PASS] [✓] PostgreSQL Schema & Redis Cloud (Connected & Configured)
[PASS] [✓] FastAPI Backend (:5133)
[PASS] [✓] React/Vite Dashboard (:5134)
[PASS] [✓] Telemetry Daemon (:5135)
[PASS] [✓] Investigation Engine API (/api/investigation/search)
[PASS] [✓] Security Guardian AST & SEC001 Regex Engine
[PASS] [✓] Project Registration & Persistence API (/api/projects)
====================================================
           VIBEPULSE — READY FOR SEMINAR
====================================================
```

---

## Exact Seminar Launch Command

```bash
pnpm dev:seminar
```
*Launches the resilient supervisor with PostgreSQL health gate, backend readiness check, live telemetry daemon, and dashboard on `http://localhost:5134` with automated health-recovery.*

---

## Timed 5-Minute Demonstration Runbook

### **00:00 — 00:30 | Workspace Home & Live Observation**
- **Action**: Open browser at `http://localhost:5134`.
- **Narration**:
  > *"Judges, VibePulse is a real-time developer observability and security intelligence platform. It runs quietly in the background alongside the developer, observing file mutations, active sessions, and security posture in real time."*
- **Visuals**:
  - Show the **Observation Status** card showing `Daemon Connected` (green pulse) and the current active project.
  - Point out that all data shown is durable and backed by local PostgreSQL.

---

### **00:30 — 01:00 | Normal File Activity**
- **Action**: In an observed project (e.g. `D:\VibePulse-Demo`), edit or touch a source file:
  ```python
  # In auth.py
  def verify_jwt_token(token: str) -> bool:
      return len(token) > 0
  ```
- **Narration**:
  > *"As I write normal application logic, VibePulse ingests file modification events over WebSocket within milliseconds, tracking session timelines without any cloud dependency."*
- **Visuals**:
  - Show the event counter increase in real time on the dashboard without refreshing the browser.

---

### **01:00 — 02:00 | Security Incident: Accidental Credential Exposure**
- **Action**: In `config/settings.py` or `src/database.py`, insert a demo secret:
  ```python
  # config/settings.py
  DATABASE_URL = "postgresql://admin:secret@db.internal:5432/production"
  API_KEY = "VIBEPULSE_DEMO_FAKE_KEY_123456"
  ```
- **Narration**:
  > *"Now imagine a developer accidentally pastes a live API token or production database credential into configuration. Watch what happens."*
- **Visuals**:
  - Save the file.
  - The **Investigation Command Center** badge or notification alerts immediately.

---

### **02:00 — 03:00 | Investigation Command Center & Dynamic Evidence Graph**
- **Action**: Navigate to `http://localhost:5134/investigation`.
- **Narration**:
  > *"Instead of an ordinary flat log list, VibePulse reconstructs the complete incident as a causal Directed Acyclic Graph."*
- **Visuals**:
  - **KPI Metrics Strip**: 
    - `OBSERVED EVENTS`
    - `SECURITY FINDINGS` (incremented)
    - `CRITICAL INCIDENTS` (incremented)
    - `SESSIONS`
    - `OBSERVED PROJECTS`
  - **Severity Ordering**: Incident ranked at the top (`CRITICAL RISK 100/100`).
  - **Interactive Evidence Graph**:
    1. Node 1: `Session Activity Initialized`
    2. Node 2: `settings.py File Modified`
    3. Node 3: `Secret Pattern Detected (SEC001: API_KEY)` (pulsing red)
    4. Node 4: `Risk Escalated to CRITICAL (100/100)`
    5. Node 5: `Investigation Incident Logged`

---

### **03:00 — 03:45 | Explainability, Secret Redaction & Provenance**
- **Action**: Click the red **Secret Pattern Detected** node in the Evidence Graph.
- **Narration**:
  > *"Notice two critical engineering guarantees: First, VibePulse masks and redacts secrets before persistence (`API_KEY = "[REDACTED]"`). Second, our detection pipeline is completely explainable — powered by Tree-Sitter AST inspection rather than opaque, hallucinating black boxes."*
- **Visuals**:
  - Detail drawer displays masked snippet.
  - **Why This Was Flagged**:
    - `+50` Hardcoded credential pattern detected (SEC001)
    - `+20` Sensitive configuration file modified
    - `+15` Authentication logic modified
    - Final Composite Score: `100 / 100` (`CRITICAL`)
  - **Detection Method & Analysis Provenance** card displays deterministic AST pipeline.

---

### **03:45 — 04:30 | Remediation & Persistence Across Restarts**
- **Action**:
  1. Click **Mark as Reviewed** (badge transitions to green `✓ Reviewed`).
  2. Kill the terminal process running the stack (Ctrl+C).
  3. Start again with `pnpm dev:seminar`.
  4. Refresh `http://localhost:5134/investigation` and `http://localhost:5134/history`.
- **Narration**:
  > *"If the daemon or entire development environment restarts, PostgreSQL remains the durable source of truth. Previous sessions and security investigations are permanently preserved, and a clean new session begins automatically."*
- **Visuals**:
  - History page shows both the finalized past session and the newly started session.
  - Investigation Command Center retains the historical incident.

---

### **04:30 — 05:00 | Architecture Summary & Closing**
- **Narration**:
  > *"To summarize: VibePulse is a zero-latency, privacy-first developer observability and security intelligence engine that turns raw filesystem activity into explainable security incident graphs."*

---

## Fail-Safe Emergency Recovery Steps

1. **If dashboard shows Disconnected**:
   - Check if daemon is running on `:5135`:
     ```bash
     curl http://localhost:5135/health
     ```
2. **If backend database connection is interrupted**:
   - Confirm PostgreSQL is active on port 5432:
     ```bash
     node scripts/seminar-doctor.mjs
     ```
3. **If port 5133, 5134 or 5135 is occupied by an old orphaned process**:
   - Check and release ports with `pnpm doctor` or:
     ```powershell
     Get-NetTCPConnection -LocalPort 5133,5134,5135 -ErrorAction SilentlyContinue | Select-Object LocalPort,OwningProcess
     ```
   - Restart cleanly with `pnpm dev:seminar`.
