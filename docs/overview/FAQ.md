# Frequently Asked Questions (FAQ)

## 1. What makes VibePulse different from WakaTime, SonarQube, or GitHub Copilot?

VibePulse is neither a time-tracker nor a code generator:

- **Unlike WakaTime**: VibePulse doesn't merely count keystroke hours; it constructs causal Directed Acyclic Graphs (DAGs) and semantic Knowledge Graphs from raw filesystem activity.
- **Unlike SonarQube / Snyk**: VibePulse observes pre-commit, real-time code evolution in the editor before git commits exist, computing live Metric Triad scores and dynamic incident resolutions.
- **Unlike GitHub Copilot**: VibePulse does not generate or write code. Its AI Engineering Copilot foundation is a zero-hallucination, deterministic intelligence engine providing explainable answers with tri-state provenance (`[OBSERVED]`, `[INFERRED]`, `[UNKNOWN]`) over your local telemetry.

---

## 2. Does VibePulse send my code to the cloud or an external LLM?

**No.** The observation daemon runs locally on your machine. AST analysis and security checks run on your local/self-hosted FastAPI backend. No source code, diffs, or prompts are sent to external cloud LLMs (OpenAI, Anthropic, etc.).

---

## 3. What are the canonical ports used by VibePulse?

VibePulse uses a dedicated port namespace to prevent conflicts with standard development services:

- **FastAPI Backend (API)**: `http://localhost:5184`
- **FastAPI Interactive Docs**: `http://localhost:5184/docs`
- **React Dashboard (UI)**: `http://localhost:5183`
- **Telemetry Daemon**: `http://localhost:5185/health`
- **PostgreSQL**: `localhost:5432`

---

## 4. How does the Metric Triad work?

The Command Center displays three complementary indicators:

1. **Overall Health Score** ($0\dots 100$, **Higher = Better**): 5-dimension composite (`Security`, `Engineering Stability`, `Incident Health`, `Resolution Health`, `Predictive Risk`).
2. **Security Risk Score** (Points, **Higher = Worse**): Sum of unmitigated AST security rules (`SEC001`, `DEBUG_TRUE`).
3. **Forecast Strength** ($0\dots 100$, **Empirical Baseline**): Statistical confidence tier based on observation history length and commit velocity.

---

## 5. How does the AI Engineering Copilot work without an LLM?

The Copilot uses deterministic intent classification across 16 canonical query families, retrieves grounded records from PostgreSQL, applies AST logic, and formats responses with explicit tri-state provenance:

- `[OBSERVED]`: Directly recorded filesystem telemetry and AST rules.
- `[INFERRED]`: Deterministically derived health metrics and priority rankings.
- `[UNKNOWN]`: Explicit observation boundaries (out-of-band deployments, remote CI).
- **Answerability Gate**: Cleanly rejects out-of-scope queries (market prices, weather, elections, private emails) without hallucination.

---

## 6. How does VibePulse ensure deterministic reconstructibility ($A \equiv B$)?

PostgreSQL 16 is the single canonical source of truth. All metrics, graphs, incident timelines, and summaries are pure deterministic mathematical projections over the immutable `development_events` and `event_analyses` tables. Replaying the event stream produces an exact, bit-for-bit identical state.

---

## 7. How are secrets protected?

AST inspection rules identify credentials and tokens matching sensitive patterns and strictly mask them to `[REDACTED]` prior to database persistence and JSON serialization.

---

## 8. What happens when I delete a project in VibePulse?

Safe Project Deletion guarantees that removing a project cascades deletion strictly to VibePulse's internal PostgreSQL database records. The physical codebase and directory on your hard drive remain 100% untouched.
