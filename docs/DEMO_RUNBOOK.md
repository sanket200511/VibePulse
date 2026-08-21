# VibePulse Live Seminar & Judge Demonstration Runbook

## 1. Executive Demonstration Goal

Demonstrate the complete, live VibePulse causal loop to seminar judges:

$$\mathbf{OBSERVE \longrightarrow DETECT \longrightarrow INVESTIGATE \longrightarrow RESOLVE \longrightarrow LEARN \longrightarrow ANTICIPATE \longrightarrow HEALTH}$$

**Key Message**: VibePulse is **NOT** a dashboard that invents ML confidence scores. Every insight, alert, and health number is deterministically derived from live development telemetry.

---

## 2. Pre-Flight Readiness Check

1. Verify system readiness with Seminar Doctor:
   ```bash
   node scripts/seminar-doctor.mjs
   ```
2. Start the unified development servers:
   ```bash
   pnpm dev
   ```
3. Open the browser to:
   `http://localhost:3000`

---

## 3. The 3-Minute Live Presentation Sequence

### Step 1: Baseline Telemetry (OBSERVE)

1. In a terminal, run the automated live demo runner:
   ```bash
   node scripts/demo-command-center.mjs
   ```
2. In the dashboard, click on the newly registered demo project.
3. Observe the **Intelligence Cascade Ribbon** at the top:
   - Green `LIVE STREAM ACTIVE` indicator.
   - Initial Health score: `100/100 (EXCELLENT)` with zero open findings.

### Step 2: Developer Introduces Secret / Risk (DETECT)

1. Watch the live timeline as a sensitive file (`src/config/settings.py`) is modified.
2. The Intelligence Cascade Ribbon highlights **`DETECT`**.
3. Security Guardian analyzes the AST diff and extracts finding `SEC001` (Hardcoded Secret).
4. Note that raw credentials are **automatically masked** with `[REDACTED]`.

### Step 3: Health Recalculation & Priority Escalation (INVESTIGATE & HEALTH)

1. Overall Health Score dynamically adjusts from `100` down to `89` (`HEALTHY` / `NEEDS_ATTENTION`).
2. Security Health dimension reflects active unmitigated finding.
3. **"What Should I Do Next?"** immediately elevates Priority `#1`:
   - Title: _Resolve CRITICAL Finding: Hardcoded Secret (SEC001)_
   - Severity: `CRITICAL` | Urgency Score: `90/100`
   - Recommended Action: _Apply validation and externalize credentials in config/settings.py._

### Step 4: Causal Downstream Inspection (DRILL-DOWN)

1. Click the event in the **Live Event Stream** on the left.
2. The **Causal Intelligence Cascade** panel on the right reveals:
   - Step 1: Raw Observation (timestamp, branch, file)
   - Step 2: AST Detection (`SEC001` with redacted snippet)
   - Step 3: Health Impact (Dimension score adjustments)
   - Step 4: 1-Click `[Investigate in Engine 3.0]` button leading directly to the Investigation Evidence Graph.

### Step 5: Trust & Explainability ("Why Does VibePulse Believe This?")

1. Click the **`[Why This Score?]`** button on the Health scorecard.
2. The **Evidence Inspector** opens showing:
   - Provenance tag: `[OBSERVED]`
   - Mathematical Score Decomposition:
     $$\text{Security } (25\%) + \text{Engineering } (20\%) + \text{Incident } (20\%) + \text{Resolution } (15\%) + \text{Predictive } (20\%) = \text{Overall}$$
   - Causal Evidence Chain tracing the exact raw file event to AST detection to health impact.
   - Click `[Why is this #1?]` on Priority #1 to view deterministic urgency scoring.

### Step 6: Engineering Knowledge Graph & Project Memory 2.0 ("What Does VibePulse Know?")

1. Click **`[Knowledge Graph]`** in the top navigation or navigate to `/projects/:id/knowledge-graph`.
2. Observe the interactive semantic graph:
   - Clustered Subsystems: `Authentication`, `Configuration`, `Database`, `API Routes`.
   - Explicit Semantic Edges: `CONTAINS`, `BELONGS_TO`, `AFFECTS`, `RESOLVED_BY`, `SUPPORTS`.
   - File Intelligence: Click on any file node to inspect total activities, AST findings, and related sessions.
   - Multi-Entity Search: Type `auth` or `jwt` to traverse connected components across files and rules.
   - Project Memory 2.0 Export: Review Section 20 of `PROJECT_CONTEXT.md` for AI handoffs.

### Step 7: Engineer Resolves Issue (RESOLVE & LEARN)

1. Developer externalizes secret into environment variable.
2. Human records resolution note in review state audit history.
3. Project Health score recovers and priority item is cleared.

### Step 8: 100% Deterministic Reconstructibility Proof ($A \equiv B$)

1. Click `[Refresh Projection]` or trigger `POST /api/projects/:id/knowledge-graph/refresh`.
2. Demonstrate that health scores, knowledge graph nodes, and priorities match the PostgreSQL ground truth identically.

---

## 4. Troubleshooting & Recovery

- **FastAPI / Daemon Offline**: Run `pnpm dev` to restart all services.
- **Port Conflict**: Kill dangling node/python processes and rerun `node scripts/seminar-doctor.mjs`.
