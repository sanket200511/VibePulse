# 🎤 01. Project Overview & Elevator Story

> **Purpose**: Use this guide to deliver a polished, high-impact 2-minute elevator pitch during technical interviews, portfolio reviews, or system design sessions.

---

## ⏱️ The 2-Minute Interview Pitch

### 1. The Context & The Hook

> "In modern cloud-native engineering, developers spend over 40% of their day switching between logs, static analysis tools, CI/CD pipelines, and incident response dashboards. When a production vulnerability or outage occurs, the single hardest question is always: _'What exact code change caused this, what is affected, and how do we fix it?'_"

### 2. The Solution (VibePulse)

> "I built **VibePulse**—a Real-Time Engineering Intelligence Platform powered by a live Knowledge Graph. VibePulse continuously monitors developer file changes via a local AST daemon, ingests events into a FastAPI backend, and correlates AST findings, incidents, root causes, and project health scores in a dynamic causal graph."

### 3. Key Technical Highlights

- **Anchor-Centered Radial Causal Layout**: Eliminates force-directed graph clutter by placing the active entity at the center $(0,0)$, upstream causes on the left, downstream blast radius on the right, and context lateral.
- **Dynamic BFS Neighborhood Isolation**: Keeps canvas utilization clean at 80% with progressive depth control (1-hop, 2-hop, 3-hop, All).
- **Automated Root Cause Stepper**: Highlights step-by-step causal pathways from raw edits to active incidents.
- **Bayesian Risk Prediction**: Calculates failure probability and real-time health score impact across 5 dimensions.

### 4. Technical Stack

- **Backend**: Python 3.12, FastAPI, Async SQLAlchemy 2.0, PostgreSQL 16, Pyright.
- **Daemon**: Node.js, TypeScript, Chokidar, AST Guardians.
- **Frontend**: React 19, Vite, Tailwind CSS, TanStack Query, SVG Custom Engine.
