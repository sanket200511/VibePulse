# DepRadar — Seminar Live Demonstration Script (5-Minute Runbook)

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
[PASS] [✓] FastAPI Backend (:5184)
[PASS] [✓] React/Vite Dashboard (:5183)
[PASS] [✓] Telemetry Daemon (:5185)
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

_Launches the resilient supervisor with PostgreSQL health gate, backend readiness check, live telemetry daemon, and dashboard on `http://localhost:5183` with automated health-recovery._

---

## Timed 5-Minute Demonstration Runbook

### **00:00 — 00:30 | Workspace Home & Live Observation**

- **Action**: Open browser at `http://localhost:5183`.
- **Narration**:
  > _"Judges, DepRadar is a real-time developer observability and security intelligence platform. It runs quietly in the background alongside the developer, observing file mutations, active sessions, and security posture in real time."_
- **Visuals**:
  - Show the **Observation Status** card showing `Daemon Connected` (green pulse) and the current active project.
  - Point out that all data shown is durable and backed by local PostgreSQL.

---

### **00:30 — 01:00 | Normal File Activity**

- **Action**: In an observed project (e.g. `D:\DepRadar-Demo`), edit or touch a source file:
  ```python
  # main.py
  def calculate_tax(amount: float) -> float:
      return amount * 0.18
  ```
- **Narration**:
  > _"As we write clean, normal code, DepRadar records continuous, low-overhead session activity in PostgreSQL without triggering false-positive alerts."_
- **Visuals**:
  - Dashboard **Live Event Stream** receives the file edit event.
  - **Overall Health Score** stays high (`100/100`).

---

### **01:00 — 02:00 | Real-Time Security Guardian Trigger**

- **Action**: Introduce a hardcoded API credential into a settings file:
  ```python
  # settings.py
  DATABASE_URI = "postgresql://user:pass@localhost:5432/app"
  API_KEY = "sk_live_99887766554433221100aabb"
  DEBUG = True
  ```
- **Narration**:
  > _"Now imagine a developer accidentally pastes a live API token or production database credential into configuration. Watch what happens."_
- **Visuals**:
  - Save the file.
  - The **Investigation Command Center** badge or notification alerts immediately.

---

### **02:00 — 03:00 | Investigation Command Center & Dynamic Evidence Graph**

- **Action**: Navigate to `http://localhost:5183/investigation`.
- **Narration**:
  > _"Instead of an ordinary flat log list, DepRadar reconstructs the complete incident as a causal Directed Acyclic Graph."_
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
  > _"Notice two critical engineering guarantees: First, DepRadar masks and redacts secrets before persistence (`API_KEY = "[REDACTED]"`). Second, our detection pipeline is completely explainable — powered by Tree-Sitter AST inspection rather than opaque, hallucinating black boxes."_
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
  4. Refresh `http://localhost:5183/investigation` and `http://localhost:5183/history`.
- **Narration**:
  > _"If the daemon or entire development environment restarts, PostgreSQL remains the durable source of truth. Previous sessions and security investigations are permanently preserved, and a clean new session begins automatically."_
- **Visuals**:
  - History page shows both the finalized past session and the newly started session.
  - Investigation Command Center retains the historical incident.

---

### **04:30 — 05:00 | Architecture Summary & Closing**

- **Narration**:
  > _"To summarize: DepRadar is a zero-latency, privacy-first developer observability and security intelligence engine that turns raw filesystem activity into explainable security incident graphs."_

---

## Fail-Safe Emergency Recovery Steps

1. **If dashboard shows Disconnected**:
   - Check if daemon is running on `:5185`:
     ```bash
     curl http://localhost:5185/health
     ```
2. **If backend database connection is interrupted**:
   - Confirm PostgreSQL is active on port 5432:
     ```bash
     node scripts/seminar-doctor.mjs
     ```
3. **If port 5184, 5183 or 5185 is occupied by an old orphaned process**:
   - Check and release ports with `pnpm doctor` or:
     ```powershell
     Get-NetTCPConnection -LocalPort 5184,5183,5185 -ErrorAction SilentlyContinue | Select-Object LocalPort,OwningProcess
     ```
   - Restart cleanly with `pnpm dev:seminar`.
