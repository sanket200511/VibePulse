# VibePulse — Judge Demonstration & Seminar Playbook

This document is the official, end-to-end playbook for demonstrating VibePulse to judges and professors during the seminar.

---

## 1. Executive Summary & Core Value Proposition

> **What to Say to the Judge**:
> *"Most developer tools are either passive git log visualizers or intrusive screen monitors. VibePulse is different: it passively and continuously observes developer activity in real-time, understands the structural and architectural context of a development session, flags high-risk security leaks deterministically before they reach git, and allows engineers to investigate why those changes matter — all while strictly redacting sensitive credentials."*

---

## 2. Architecture & Mental Model

```
Observed Project (e.g. D:\VibePulse-Demo)
      │
      ▼
Node.js Telemetry Daemon (:9000)
├── Chokidar File Watcher (Ignored patterns: .git, node_modules, __pycache__)
├── Path Normaliser & Native NTFS Canonicalizer
├── Debouncer (collapses rapid file save bursts)
└── WatchManager (enables dynamic project switching without process restart)
      │
      ▼ HTTP POST /events
FastAPI Backend (:8000)
├── Session Touch Engine (partitions events per canonical project root)
├── Security Analyzer (AST pattern detector for SEC001 hardcoded secrets)
├── Code Evolution Engine (detects function/class/import additions & removals)
├── PostgreSQL 16 (:5432) (persistent audit log of events & analyses)
└── WebSocket Hub (/ws/events, /ws/sessions)
      │
      ▼ WebSocket
React / TanStack Query Dashboard (:3000)
├── Workspace Home (Live session telemetry, event stream, pulse graph)
├── Projects (Active & historical watched repositories)
├── Investigation (AST-filtered incident investigation)
└── Session History (Session playback and timeline)
```

---

## 3. The 5-Minute Judge Demonstration

### Setup (Pre-Demo)
1. Ensure the controlled demo project exists: `D:\VibePulse-Demo`
2. Start the local stack:
   ```powershell
   pnpm dev
   ```
3. Open the browser to: `http://localhost:3000`

---

### Scene 1: Passive Observation & Live Stream (1 Minute)

**Action**:
Modify `src/auth.py` in `D:\VibePulse-Demo`:
```powershell
Add-Content -Path "D:\VibePulse-Demo\src\auth.py" -Value "`ndef verify_signature(data: str) -> bool:`n    return len(data) > 0`n"
```

**Expected Result**:
- Within milliseconds, `FILE_MODIFIED src/auth.py` appears live in Workspace Home via WebSocket.
- The active session event counter increments.
- Expanding the event row shows **Code Evolution**: `Function Added: verify_signature`.

**Talking Points**:
> *"Notice that I didn't type a git command or run a manual audit. VibePulse passively captured the OS-level file modification, debounced the write burst, extracted the AST change, and rendered it in real time."*

---

### Scene 2: High-Risk Security Alert — Hardcoded Secret Leak (1.5 Minutes)

**Action**:
Add a fake API key and database URL to `config/settings.py`:
```powershell
Add-Content -Path "D:\VibePulse-Demo\config\settings.py" -Value @'

# Critical service credentials
API_KEY = "VIBEPULSE_DEMO_FAKE_KEY_123456"
DATABASE_URL = "postgresql://admin_user:VIBEPULSE_DEMO_PASSWORD@localhost:5432/production_db"
'@
```

**Expected Result**:
- The dashboard immediately highlights the event with a prominent **`HIGH RISK`** Security Alert.
- Expanding the finding reveals:
  - **Rule**: `SEC001` (Hardcoded Secret Detected)
  - **Severity**: `HIGH`
  - **Location**: `config/settings.py`
  - **Redacted Evidence**: `API_KEY = "********REDACTED********"`
  - **Remediation**: *"Move secret to environment/secret storage."*

**Talking Points**:
> *"Here is VibePulse Security Guardian. As soon as a credential or connection string is written to a file, our AST analyzer catches it before it is ever committed. Crucially, notice the Zero-Leakage guarantee: the secret value is strictly redacted in PostgreSQL, the API, and the UI. We never store or log raw plaintext credentials."*

---

### Scene 3: Explainable Risk Intelligence & Session Insights (1 Minute)

**Action**:
Inspect the session summary and risk breakdown on the dashboard.

**Talking Points**:
> *"Why is this session marked HIGH risk? VibePulse doesn't generate opaque, unexplainable numbers. The risk score is directly derived from observable signals:
> 1. Hardcoded credential pattern detected (+50)
> 2. Sensitive configuration file modified (+20)
> 3. Burst of rapid modifications (+15)
> Every score is auditable and backed by deterministic evidence."*

---

### Scene 4: Incident Investigation & Timeline (1.5 Minutes)

**Action**:
Click **Investigation** (`http://localhost:3000/investigation`) and filter by `severity:HIGH` or click the session replay.

**Expected Result**:
- The investigation engine displays the chronological incident sequence:
  1. `src/auth.py` modified (routine development)
  2. `config/settings.py` modified (configuration change)
  3. `SEC001` hardcoded credential leak triggered
- Full context and timeline position are visualised.

**Talking Points**:
> *"When security teams or senior engineers conduct a post-incident review, they don't have to wade through thousands of unrelated server logs. Investigation provides the complete developmental context leading up to the vulnerability."*

---

### Scene 5: Zero-Restart Runtime Project Switching (1 Minute)

**Action**:
Switch observation to another project (`Animal Disease Prediction`) without restarting the stack:
```powershell
Invoke-RestMethod -Uri "http://localhost:9000/watch" -Method POST -ContentType "application/json" -Body '{"root": "D:\\Projects\\Animal Disease Prediction"}'
```

**Verification**:
Modify a file in `Animal Disease Prediction`:
```powershell
Add-Content -Path "D:\Projects\Animal Disease Prediction\test_live.py" -Value "# Switched project test"
```
Show on the dashboard that the event is attached to `Animal Disease Prediction`, while `VibePulse-Demo`'s history remains intact.

**Talking Points**:
> *"VibePulse is designed for real developer workflows where engineers switch repositories throughout the day. Through our WatchManager abstraction, observation targets can be changed dynamically without restarting the server or dropping monitoring connections."*

---

## 4. Post-Demo Cleanup Commands

```powershell
# Restore sample demo files
Set-Content -Path "D:\VibePulse-Demo\src\auth.py" -Value "def authenticate_user(username: str, token: str) -> bool:`n    return bool(username and token)`n"
Set-Content -Path "D:\VibePulse-Demo\config\settings.py" -Value "APP_ENV = 'production'`nDEBUG = False`n"
Remove-Item "D:\Projects\Animal Disease Prediction\test_live.py" -ErrorAction SilentlyContinue
```

---

## 5. Potential Failure Points & Backup Procedures

| Potential Issue | Root Cause | Immediate Fix |
|---|---|---|
| Port collision on startup (`3000`, `8000`, `9000`) | Stale terminal processes holding sockets | Run: `Get-NetTCPConnection -LocalPort 3000,8000,9000 -State Listen \| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }` then `pnpm dev` |
| Redis Cloud latency / disconnect | Network firewall | Core observability, security scanning, and session tracking run against local PostgreSQL and are 100% functional without Redis |
| External AI provider unavailable | Rate limit / offline API | VibePulse uses local deterministic AST analyzers as primary; AI summary falls back gracefully to deterministic heuristics |
