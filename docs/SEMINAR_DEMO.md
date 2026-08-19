# VibePulse — Live Seminar Demonstration Guide (5–7 Minutes)

This guide provides the exact step-by-step procedure, commands, and speaking script for demonstrating VibePulse live during the seminar.

---

## Architecture Overview (Mental Model)

```
Target Project on Disk
       ↓
Chokidar Watcher + Normaliser (Node.js Daemon :9000)
       ↓
FastAPI Ingestion (:8000) → PostgreSQL Local (:5432)
       ↓
Live WebSocket Pipeline (/ws/events, /ws/sessions)
       ↓
React/Vite Dashboard (:3000) [Workspace, Projects, History, Investigation]
```

---

## Pre-Flight Checklist

Before the professor sits down:
1. Ensure PostgreSQL is running on `localhost:5432`.
2. Start the stack in your terminal:
   ```powershell
   pnpm dev
   ```
3. Open the browser to: `http://localhost:3000`

---

## Live Demo Steps

### Step 1: Start & System Health (30 seconds)

**Action**:
Open `http://localhost:3000/projects`.

**Terminal / Status Check**:
```powershell
Invoke-RestMethod http://localhost:9000/health
```
**Expected Output**:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "observing": true,
  "project_name": "ArithFlow",
  "root": "D:\\Projects\\ArithFlow"
}
```

**What to Say**:
> *"VibePulse is a real-time Software Engineering Intelligence platform. It runs a zero-overhead local telemetry daemon that observes developer activity, processes events through an asynchronous pipeline, and provides live insights without modifying developer workflow."*

---

### Step 2: Feature 1 — Real-Time Observability (1 minute)

**Action**:
Create or edit a harmless file in the currently watched project (`D:\Projects\ArithFlow`):
```powershell
Set-Content -Path "D:\Projects\ArithFlow\math_utils.py" -Value "def add(a, b): return a + b"
```

**Expected Result**:
- Within milliseconds, the **Workspace Home** (`http://localhost:3000`) updates live via WebSocket.
- The event feed displays `FILE_CREATED math_utils.py`.
- The active session counter increments deterministically.

**Cleanup**:
```powershell
Remove-Item "D:\Projects\ArithFlow\math_utils.py"
```

**What to Say**:
> *"As soon as I create or modify a file, the OS filesystem event is normalized, debounced to collapse bursts, and pushed over WebSocket to the dashboard. No synthetic polling — every metric is backed by deterministic evidence."*

---

### Step 3: Feature 2 — Zero-Restart Runtime Project Switching (1.5 minutes)

**Action**:
Switch observation to another project (`Animal Disease Prediction`) **without restarting the stack**:
```powershell
Invoke-RestMethod -Uri "http://localhost:9000/watch" -Method POST -ContentType "application/json" -Body '{"root": "D:\\Projects\\Animal Disease Prediction"}'
```

**Expected Output**:
```json
{
  "status": "observing",
  "project_name": "Animal Disease Prediction",
  "root": "D:\\Projects\\Animal Disease Prediction"
}
```

**Verification**:
1. Create a test file in the new project:
   ```powershell
   Set-Content -Path "D:\Projects\Animal Disease Prediction\model_pipeline.py" -Value "# Model pipeline update"
   ```
2. Check `http://localhost:3000/projects` and Workspace Home.

**Cleanup**:
```powershell
Remove-Item "D:\Projects\Animal Disease Prediction\model_pipeline.py"
```

**What to Say**:
> *"VibePulse supports dynamic multi-project observation. Through our WatchManager abstraction, we can switch the active observation target live. The previous watcher closes cleanly, stale events are invalidated, and a new session is allocated without restarting FastAPI, the database, or the daemon."*

---

### Step 4: Feature 3 — Real-Time Secret & Password Leak Detection (1.5 minutes)

**Action**:
Create a test file with obvious fake credentials in the active project:
```powershell
Set-Content -Path "D:\Projects\Animal Disease Prediction\test_config.py" -Value @'
# Database Configuration
API_KEY = "DEMO_FAKE_API_KEY_987654321"
DATABASE_URL = "postgresql://demo_admin:DEMO_SECRET_PASS@localhost:5432/prod_db"
'@
```

**Expected Result**:
- Security Analyzer inspects the file modification AST / patterns.
- Generates finding `SEC001` (Hardcoded Secret Detected) with `HIGH` severity.
- **Critical Security Guarantee**: The raw secret is **100% redacted** in the database, API response, and UI:
  `Value: ********REDACTED********`

**Cleanup**:
```powershell
Remove-Item "D:\Projects\Animal Disease Prediction\test_config.py"
```

**What to Say**:
> *"Here is VibePulse Security Guardian in action. As soon as a hardcoded secret or credential is committed or saved, our AST-level analyzer detects the leak, flags it as HIGH severity, and strictly redacts the sensitive value so raw credentials are never persisted to disk or leaked in logs."*

---

### Step 5: Feature 4 — Session History & Investigation (1.5 minutes)

**Action**:
1. Open **History** (`http://localhost:3000/history`):
   - Show the partitioned sessions for `ArithFlow` and `Animal Disease Prediction`.
   - Select a session to view event timeline and duration.
2. Open **Investigation** (`http://localhost:3000/investigation`):
   - Filter by `severity:HIGH` to instantly isolate the secret leak event.
   - Show deterministic AST search.

**What to Say**:
> *"All telemetry is partitioned per project and session. In Investigation, engineers can query historical activity with deterministic filters such as severity or event type. If an LLM provider is configured, VibePulse offers AI explanations; if offline, it gracefully falls back without disrupting the core observability pipeline."*

---

## Emergency Quick Commands

| Concern | Command |
|---|---|
| Check Doctor Status | `node scripts/doctor.mjs` |
| Check Daemon Health | `Invoke-RestMethod http://localhost:9000/health` |
| Switch Project Live | `Invoke-RestMethod -Uri "http://localhost:9000/watch" -Method POST -ContentType "application/json" -Body '{"root": "D:\\Projects\\..."}'` |
| Free Collided Ports | `Get-NetTCPConnection -LocalPort 3000,8000,9000 -State Listen \| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }` |
