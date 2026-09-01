# VibePulse — Live Seminar Demonstration & Screen Recording Runbook

**Target Audience:** Academic Evaluators, Final-Year Project Viva Committee, Seminar Attendees  
**Demo Project Name:** `VibePulse-Seminar-Demo`  
**Project ID:** `c95554c9-2b13-4b2d-882a-660cd2da14fe`  
**Base URL:** `http://localhost:5183`  
**API URL:** `http://127.0.0.1:5184`

---

## Recording Checklist Before You Begin

- [ ] Chrome/Browser open at `http://localhost:5183/` (1920×1080 resolution recommended).
- [ ] Dev services running (`pnpm dev` in background, PostgreSQL on `:5432`).
- [ ] Screen recording tool set to 1080p60 / microphone unmuted.
- [ ] Clean browser window with no unrelated tabs or extensions.

---

## 1. Introduction & Workspace Home

- **Page:** `http://localhost:5183/`
- **Action:** Open Workspace Home.
- **What to Point At:**
  - Header brand: **VibePulse** wordmark with live connection indicator (`Connected :5184`).
  - Top 3 permanent navigation anchors: **Workspace**, **Projects**, **History**.
  - Connected Projects list showing `VibePulse-Seminar-Demo` and `Dabba`.
  - Live observation status badge: `OBSERVING ACTIVE`.
- **What to Say:**
  > _"Welcome to VibePulse, the deterministic Developer Observability and Engineering Intelligence Platform for the AI coding era. Rather than relying on LLM guesswork or static vanity metrics, VibePulse continuously observes real filesystem telemetry, executes deterministic AST analysis in PostgreSQL, and synthesizes engineering intelligence across security, stability, architecture, and predictive risk."_

---

## 2. Projects Directory & Project Story Cockpit

- **Page:** `http://localhost:5183/projects` → Click `VibePulse-Seminar-Demo`
- **Target URL:** `http://localhost:5183/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe`
- **Action:** Navigate to Project Story.
- **What to Point At:**
  - Standardized Breadcrumbs: `Workspace → Projects → VibePulse-Seminar-Demo`.
  - **Primary Cockpit Hero:** "Launch Engineering Command Center" CTA button.
  - **Specialized Intelligence Hub (6 Cards):** Security Intelligence, Investigation Forensics, Predictive Center, Knowledge Graph Topology, AI Copilot, AI Provenance.
  - **Memory & Utilities Bar:** Project Memory anchor link and Markdown Context Export button.
- **What to Say:**
  > _"Here in the Project Story cockpit, we see the complete operational hub for VibePulse-Seminar-Demo. The architecture follows a strict 3-tier hierarchy: primary executive health launchpad at the top, a 6-card specialized intelligence grid in the center, and portable project memory utilities at the bottom."_

---

## 3. Engineering Command Center — Executive Intelligence

- **Page:** `http://localhost:5183/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/command-center`
- **Action:** Click "Launch Engineering Command Center".
- **What to Point At:**
  - **Overall Health Scorecard:** Dynamic score calculated from the 5 weighted dimensions.
  - **The 5 Health Dimensions:**
    1. _Security Health_ (25% weight)
    2. _Engineering Stability_ (20% weight)
    3. _Incident Health_ (20% weight)
    4. _Resolution Health_ (15% weight)
    5. _Predictive Risk Health_ (20% weight)
  - **"What Should I Do Next?" Priority Action Engine:** Ranked priorities with explainable urgency scores and recommended remediation actions.
  - **Mathematical Decomposition Panel:** Exact transparency into how every point is calculated ($A \equiv B$).
- **What to Say:**
  > _"The Engineering Command Center unifies real-time telemetry into a single, explainable health model. VibePulse computes five orthogonal dimensions of codebase health. Notice that every score includes a mathematical decomposition breakdown—there are zero fabricated numbers."_

---

## 4. Security Command Center — AST & SEC001 Detection

- **Page:** `http://localhost:5183/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/security`
- **Action:** Click "Security Command Center" in the breadcrumbs or Project Story.
- **What to Point At:**
  - Finding Cards: `SEC001` (Hardcoded Secret Violation) and `DEBUG_TRUE` in `config/settings.py`.
  - **Secret Masking:** Highlight that raw API keys are strictly masked to `[REDACTED]`.
  - Risk Score impact and Sensitive Files Inventory (`config/settings.py`, `src/auth.py`).
- **What to Say:**
  > _"When an engineer modified `config/settings.py` with hardcoded credentials and `DEBUG = True`, the Security Guardian AST analyzer immediately detected the rule violations. Notice our strict security invariant: raw secrets are masked to [REDACTED] at the boundary and never exposed in logs, database projections, or exports."_

---

## 5. Investigation Engine — Causal DAG & Root Cause

- **Page:** `http://localhost:5183/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/investigation`
- **Action:** Click on the incident `Observed Development Incident` (`inc_sec001`).
- **What to Point At:**
  - **Incident Header:** Severity (`CRITICAL` / `HIGH`), Risk Score (`85/100`), Status (`RESOLVED`).
  - **Causal Evidence Chain:** Interactive node-link DAG linking File Modification → AST Rule Trigger → Risk Contribution → Project Health Impact.
  - **Search & Filter Test:**
    - Type `settings.py` into the search bar → incident remains visible.
    - Type `nonexistent_term_xyz` → shows `FILTERED_EMPTY` state with "Clear Filters" button.
    - Click "Clear Filters" → list restores immediately.
- **What to Say:**
  > _"In the Investigation Engine, VibePulse reconstructs the complete causal DAG of the incident. It traces the exact commit and file modification that introduced the vulnerability, computes the root cause, and provides step-by-step resolution recommendations."_

---

## 6. Incident Resolution & Historical Audit Learning

- **Page:** Inside Investigation detail view → Scroll to **Resolution & Audit History**
- **What to Point At:**
  - Audit Trail of transitions:
    1. `OPEN → INVESTIGATING` by _Alice SecOps_ ("Initial triage: confirmed exposed API_KEY").
    2. `INVESTIGATING → REVIEWED` by _Bob Senior Architect_ ("Key rotated upstream in vault").
    3. `REVIEWED → RESOLVED` by _Lead Developer_ ("Secrets externalized to environment variables and DEBUG set to False").
  - Current status: **RESOLVED**.
- **What to Say:**
  > _"VibePulse doesn't simply discard an incident once resolved. It creates an immutable review history in PostgreSQL. This transition data feeds directly into our Resolution Health dimension and informs the AI Copilot during future investigations."_

---

## 7. Predictive Intelligence & Hotspot Ranking

- **Page:** `http://localhost:5183/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/predictions`
- **Action:** Open Predictive Intelligence.
- **What to Point At:**
  - **Forecast Status:** `READY` (Calculated from real observed events).
  - **Active Hotspot Rankings:** `config/settings.py`, `src/payments.py`, `src/api.py`.
  - **Focus Drift:** Velocity migration from _Core Application Setup_ to _Payment & Routing Acceleration_.
  - **7-Day Risk Velocity Trend:** Empirical trend series based on event density.
- **What to Say:**
  > _"Predictive Intelligence uses empirical churn velocity and modification frequency across subsystems to forecast where engineering regressions or security hotspots are likely to emerge next. If there were insufficient history, VibePulse would explicitly display an explainable Insufficient Evidence warning rather than hallucinating predictions."_

---

## 8. Semantic Knowledge Graph & Topology Search

- **Page:** `http://localhost:5183/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/knowledge-graph`
- **Action:** Open Knowledge Graph.
- **Search Interactions to Demonstrate:**
  1. Search for: `settings.py` → Click the node.
     - _Point at:_ Node Inspector showing subsystem (`Configuration`), connected findings, and incoming/outgoing edges.
  2. Search for: `payments.py` → Click the node.
     - _Point at:_ Subsystem classification (`Payment Core`) and transaction dependencies.
  3. Search for: `Security Health` → Click the health node.
     - _Point at:_ Mathematical relationship linking Security AST findings to the overall project health score.
  4. Search for: `nonexistent_node` → View clean empty search feedback.
- **What to Say:**
  > _"The Knowledge Graph materializes the codebase as a connected semantic topology. It links files, subsystems, security findings, incidents, predictions, and health dimensions. Clicking any node opens the Contextual Inspector with provenance and edge explanations."_

---

## 9. AI Engineering Copilot — Live Zero-Hallucination QA

- **Page:** `http://localhost:5183/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/copilot`
- **Action:** Execute the following sequence of queries in the Copilot chat prompt:

### Query 1 (Project Overview):

- **Input:** `What do we know about this project?`
- **Expected Result:** Summary detailing project identity, root path, detected subsystems (`Configuration`, `Authentication`, `Payment Core`), and active health state.
- **What to Say:** _"Notice how Copilot extracts grounded facts with explicit observed and inferred provenance."_

### Query 2 (Prioritized Action):

- **Input:** `What should I do next?`
- **Expected Result:** Priority #1 recommendation with urgency score and direct deep-link.

### Query 3 (Security Findings):

- **Input:** `What security issues have been observed?`
- **Expected Result:** Details of AST rules (`SEC001`, `DEBUG_TRUE`) in `settings.py` with all secrets masked to `[REDACTED]`.

### Query 4 (File Forensics):

- **Input:** `What happened to settings.py?`
- **Expected Result:** File telemetry history, associated subsystem, security findings, and resolution status.

### Query 5 (Resolution Audit):

- **Input:** `How was this incident resolved?`
- **Expected Result:** Complete resolution audit trail quoting Lead Developer and Alice SecOps.

### Query 6 (Out-of-Scope Zero Hallucination Gate):

- **Input:** `What is the weather today?`
- **Expected Result:** `answerable: false` / Out-of-scope response stating that VibePulse strictly answers questions grounded in observed engineering telemetry.
- **What to Say:** _"This is crucial: when evidence does not exist in the project telemetry, VibePulse's Answerability Gate rejects the query cleanly. It never hallucinates."_

---

## 10. AI Provenance & Portable Memory Export

- **Pages:**
  1. `http://localhost:5183/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/ai-provenance`
  2. `http://127.0.0.1:5184/api/projects/c95554c9-2b13-4b2d-882a-660cd2da14fe/context/export`
- **What to Point At:**
  - **AI Provenance:** Validates that the endpoint returns `application/json` with 100% deterministic grounding.
  - **Context Export:** Open or download `PROJECT_CONTEXT.md` (over 15 KB). Point out **Section 21 (Copilot Context)**, the complete fact inventory, and confirmed `[REDACTED]` secret safety.
- **What to Say:**
  > _"Finally, VibePulse provides portable Project Memory. The exported `PROJECT_CONTEXT.md` document packages the entire verified engineering context for AI coding assistants—Cursor, Claude, or Copilot—ensuring AI tools operate with complete grounding without leaking confidential credentials."_

---

## 11. Closing Viva Statement

> _"In summary, VibePulse bridges the gap between raw developer activity and high-confidence engineering intelligence. Through continuous observation, deterministic AST security analysis, explainable health decomposition, immutable incident resolution learning, empirical predictive churn modeling, semantic graph topology, and a zero-hallucination AI Copilot, VibePulse establishes a single canonical source of truth for modern software teams."_
