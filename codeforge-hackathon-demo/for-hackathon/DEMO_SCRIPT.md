# 🎬 VibePulse — Hackathon Presentation & Live Demo Script

This script is structured for a **3-Minute High-Impact Hackathon Presentation** and a **5-Minute Deep-Dive Judge Demonstration**.

---

## ⏱️ 3-Minute Pitch Script

### Minute 0:00 – 0:45 | The Problem (The "Pain")

> "Judges, modern software engineering is broken not because we lack tools, but because our tools don't talk to each other.
> You get a Sentry alert for a production crash, a SonarQube report with 200 security warnings, and a Git commit history—all disconnected. Tracing _what change caused what incident_ takes hours of manual digging.
> Today, we present **VibePulse**—the world's first Real-Time Correlation & Causality Platform that turns fragmented telemetry into a Live Knowledge Graph."

---

### Minute 0:45 – 2:00 | Live Product Demo (The "Wow" Factor)

_(Presenter switches to dashboard at `http://localhost:5183/projects/334351d3-4aeb-4bc4-9387-f22e236acda8/knowledge-graph`)_

1. **Focused Causal Graph**:

   > "Look at our live dashboard. Unlike traditional crowded node graphs, VibePulse centers on the selected entity—here, `settings.py`. On the left, you see the exact developer event that modified it. On the right, you see the downstream security finding `SEC001: Hardcoded Credential` and incident `INC01`."

2. **Root Cause Traversal**:

   > "Watch what happens when I click **Trace Root Cause**. The canvas automatically dims unrelated nodes and highlights the exact causal pathway: from commit `a8f19c` $\to$ file edit $\to$ security vulnerability $\to$ incident."

3. **Predictive Risk & Grounded Evidence**:

   > "When I click `SEC001`, our Intelligence Inspector shows grounded line-level diffs, severity ratings, and Bayesian prediction showing an 85% probability of credential exposure."

4. **Gestures & Fullscreen Mode**:
   > "For complex codebases, press `F` for Fullscreen Mode—just like YouTube. Use trackpad pinch-to-zoom or scroll centered at your cursor, double-click empty space to auto-fit, and cycle depth from 1-hop to the entire project topology."

---

### Minute 2:00 – 3:00 | Architecture & Conclusion

> "Behind the scenes, VibePulse runs an AST static analyzer daemon on port `5185`, streaming real-time events to a FastAPI backend on port `5184` powered by PostgreSQL.
> VibePulse transforms engineering teams from reactive firefighting to predictive, causally grounded observability. Thank you!"

---

## 🛠️ 5-Minute Deep-Dive Demo Runbook (For Judges Booth)

| Step               | Action                                      | Verbal Explanatory Highlight                              |
| ------------------ | ------------------------------------------- | --------------------------------------------------------- |
| **1. Overview**    | Show `http://localhost:5183`                | Explain project story cards & global risk score (95/100). |
| **2. Search**      | Type `settings.py`                          | Demonstrate instant search centering & node positioning.  |
| **3. Modes**       | Click `Investigation` mode button           | Show mode filtering reducing graph to causal entities.    |
| **4. Depth**       | Click `Depth 1` $\to$ `Depth 2` $\to$ `All` | Demonstrate progressive neighborhood disclosure.          |
| **5. Evidence**    | Click `View Grounded Evidence`              | Show line-level raw code diff, CWE info, and timestamp.   |
| **6. Remediation** | Switch to `Before / After` view             | Demonstrate verified compliance posture audit.            |
