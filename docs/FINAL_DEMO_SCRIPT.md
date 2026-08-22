# VibePulse — Live Demonstration Speaking Script

**Purpose**: Word-for-word presenter script for 5-Minute, 10-Minute, and 15-Minute presentations.

---

## 1. Five-Minute Pitch Demo

### [00:00 - 01:00] Stage 1: OBSERVE
- **WHAT TO CLICK**: Open browser at `http://localhost:5134`. Navigate to **Command Center**.
- **WHAT TO SHOW**: Live Telemetry Feed (connected, waiting for events).
- **WHAT TO SAY**:
  > *"Good morning, respected evaluators. Modern engineering visibility is broken because tools only see code after it is committed to Git. VibePulse observes development activity continuously at the filesystem level. I have our daemon watching a sample banking project. Watch what happens as I edit `src/auth/jwt_service.py` in my editor."*
- **ACTION**: Save file in editor.
- **WHAT RESULT TO EXPECT**: A `FILE_MODIFIED` event immediately appears in the Command Center stream.
- **IF SOMETHING FAILS**: Point to PostgreSQL terminal and explain that events are persisted directly into `development_events`.

---

### [01:00 - 02:00] Stages 2 & 3: DETECT & UNDERSTAND
- **ACTION**: Add `DEBUG = True` and a synthetic API key `sk_live_demo12345` into `config/settings.py`. Save file.
- **WHAT TO SHOW**: Security Cockpit card flashing; active findings incrementing.
- **WHAT TO SAY**:
  > *"The moment I introduce a dangerous configuration or hardcode an API credential, VibePulse's static AST engine detects the violation. Notice that the sensitive token is strictly masked to `[REDACTED]`. The Security Risk Score increases, and our Overall Project Health automatically recalculates to reflect the risk."*
- **WHAT RESULT TO EXPECT**: Health score degrades from Excellent to Healthy or Needs Attention.

---

### [02:00 - 03:00] Stage 4: INVESTIGATE
- **WHAT TO CLICK**: Click **Investigate** on the active incident card.
- **WHAT TO SHOW**: Investigation Causal DAG and narrative timeline.
- **WHAT TO SAY**:
  > *"VibePulse doesn't just display a warning—it reconstructs the entire causal chain. Here is the exact timeline showing when the file was modified, which AST rule was violated, and how the incident escalated across the Configuration subsystem."*

---

### [03:00 - 04:00] Stage 8: ASK (AI Engineering Copilot)
- **WHAT TO CLICK**: Open the Copilot Mini-Console on the Command Center.
- **WHAT TO TYPE**: `"What should I fix first?"`
- **WHAT TO SAY**:
  > *"Unlike generic LLMs that might guess or hallucinate project architecture, VibePulse's Copilot is 100% deterministic. Look at the structured response: it identifies our critical security finding as Priority #1, links directly to the affected file, and explicitly tags facts as `[OBSERVED]` or `[INFERRED]`."*
- **WHAT TO TYPE (Out of Scope)**: `"What is the Bitcoin price?"`
- **WHAT TO SAY**:
  > *"When an examiner asks how we handle out-of-scope questions, our Answerability Gate cleanly rejects the query with `answerable: false` because it knows what it does not know."*

---

### [04:00 - 05:00] Stages 5, 9 & 10: RESOLVE, ACT & MEMORY
- **ACTION**: Revert `config/settings.py` to `DEBUG = False` and remove the secret.
- **WHAT TO CLICK**: In Investigation, click **Mark Resolved** and enter resolution note: *"Externalized secrets and disabled debug flag"*.
- **WHAT TO SAY**:
  > *"When the engineer fixes the code and resolves the incident, the closed loop completes: new telemetry is recorded, the incident is logged with an immutable audit history, and refreshing health restores our score. Finally, clicking Export generates `PROJECT_CONTEXT.md`—a portable 22-section memory file ready for AI agents. That is VibePulse: continuous, deterministic, and evidence-grounded."*

---

## 2. Ten-Minute In-Depth Demo

Includes the complete 5-minute flow plus:
1. **Stage 6 (LEARN)**: Open **Incident Review History** to show the persisted state transitions (`OPEN` $\to$ `INVESTIGATING` $\to$ `REVIEWED` $\to$ `RESOLVED`) in PostgreSQL.
2. **Stage 7 (PREDICT)**: Open **Predictive Intelligence** tab to show linear regression churn velocity, focus drift, and subsystem hotspot rankings.
3. **Stage 10 (KNOWLEDGE GRAPH)**: Open **Knowledge Graph Explorer** to demonstrate interactive graph traversal across 9 node types and 8 verified edge types.

---

## 3. Fifteen-Minute Technical Defense Demo

Includes the 10-minute flow plus:
1. **Reconstructibility Demonstration ($A \equiv B$)**:
   - Restart the FastAPI backend server live.
   - Refresh the browser and query Copilot again.
   - Point out that every score, graph edge, and incident narrative recomputed identically from PostgreSQL ground truth.
2. **Safe Project Deletion Demonstration**:
   - Delete a dummy test project from the UI.
   - Open the operating system terminal and show that the physical folder on disk was **not** deleted.
3. **Universal Evidence Inspector**:
   - Drill into the 5-dimension health scorecard to explain the exact mathematical weights ($W_i \times S_i$).
