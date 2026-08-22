# VibePulse — Final Demonstration Runbook & Presentation Guide

**Audience**: Final-Year Project Evaluators, Professors, Academic Examiners, and Technical Judges  
**Core Thesis**: _Observe First. Derive Carefully. Never Invent._

---

## 1. Pre-Demo Setup Checklist

Run this 2 minutes before the presentation begins:

- [ ] **PostgreSQL**: Running on port `5432` with latest schema (`alembic upgrade head`).
- [ ] **FastAPI Backend**: `uv run uvicorn app.main:app --port 5133` (Healthy at `http://localhost:5133/health`).
- [ ] **React Dashboard**: `pnpm --filter @vibepulse/dashboard dev` (Accessible at `http://localhost:5134`).
- [ ] **Node Observation Daemon**: Operational on port `5135` (`http://localhost:5135/health`).
- [ ] **Seminar Doctor Audit**: Run `node scripts/seminar-doctor.mjs` and confirm all checks pass.
- [ ] **Browser**: Open `http://localhost:5134` in full screen (Dark Mode enabled).

---

## 2. 5-Minute Pitch Demo

### Minute 1: The Problem & Observation (Stage 1)

- **Action**: Open Dashboard at Command Center. Start observation daemon on the sample banking project.
- **What to Say**:
  > _"Modern engineering visibility is broken. Git only sees finished commits, and AI coding assistants frequently hallucinate project architecture. VibePulse introduces continuous filesystem observation. Without manual developer reporting, every change is captured into PostgreSQL ground truth."_

### Minute 2: Security Detection & Redaction (Stages 2 & 3)

- **Action**: Add an API key and `DEBUG = True` to `config/settings.py`.
- **What to Say**:
  > _"Notice how the moment a security-sensitive change occurs, our AST rule engine detects the violation, computes the risk score, and strictly masks the secret to `[REDACTED]` before persistence."_

### Minute 3: Incident Investigation & Causal Graph (Stage 4)

- **Action**: Click into Investigation from the active incident card.
- **What to Say**:
  > _"VibePulse doesn't just sound an alarm—it reconstructs the entire causal DAG. We can see the exact file modification, the triggered rule, and why the Health Score degraded."_

### Minute 4: AI Copilot without Hallucination (Stage 8)

- **Action**: Type _"What should I fix first?"_ into the Command Center Copilot mini-console.
- **What to Say**:
  > _"Unlike generic LLMs that guess, VibePulse's Copilot is 100% deterministic. Every single statement is categorized into `[OBSERVED]` telemetry, `[INFERRED]` intelligence, or `[UNKNOWN]` boundaries."_

### Minute 5: Remediation & Closed-Loop Recovery (Stages 5, 9 & 10)

- **Action**: Revert the secret, submit the resolution note, and refresh health.
- **What to Say**:
  > _"When the engineer patches the issue, the feedback loop closes: new telemetry is recorded, the incident is resolved with an audit trail, health recovers, and project memory is permanently updated."_

---

## 3. 10-Minute In-Depth Demo

Includes all of the 5-minute flow plus:

1. **Stage 6 (LEARN)**: Open Incident Review History to show the immutable audit trail (`OPEN` $\to$ `INVESTIGATING` $\to$ `REVIEWED` $\to$ `RESOLVED`).
2. **Stage 7 (PREDICT)**: Open Predictive Intelligence to demonstrate regression forecasts and subsystem focus drift.
3. **Stage 10 (MEMORY)**: Open Knowledge Graph and export `PROJECT_CONTEXT.md` to demonstrate the portable AI agent handoff model.
4. **Answerability Gate**: Ask _"What is the Bitcoin price?"_ to show how the system refuses out-of-scope queries with `answerable: false`.

---

## 4. 15-Minute Deep Academic & Technical Demo

Includes all 10-minute flow plus:

1. **Reconstructibility Audit ($A \equiv B$)**:
   - Restart the API server and show that Copilot queries return identical answers from PostgreSQL.
   - **What to Say**: _"These are not ephemeral in-memory states. All intelligence is a pure mathematical projection over PostgreSQL telemetry."_
2. **Safe Project Deletion**:
   - Delete a test project and show that the developer's physical codebase on disk remains completely untouched.
3. **Universal Evidence Inspector**:
   - Open the Evidence Inspector to walk through the mathematical weight breakdown ($W_i \times S_i$) for each health dimension.
