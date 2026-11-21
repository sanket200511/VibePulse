# 📚 CodeForge Hackathon & Interview Master Documentation

Welcome to the **VibePulse** (CodeForge Hackathon Edition) comprehensive documentation repository. This directory contains complete, exhaustive guides, code walkthroughs, interview prep cheat sheets, system design diagrams, and hackathon presentation scripts for understanding every aspect of the project.

---

## 📂 Directory Structure

### 🏆 [`for-hackathon/`](./for-hackathon/)

Guides, scripts, market research, and quick-start manuals for hackathon judges, users, and evaluators:

1. **[`README.md`](./for-hackathon/README.md)** — Project summary, value proposition, and quick links.
2. **[`START_GUIDE.md`](./for-hackathon/START_GUIDE.md)** — Step-by-step setup guide (ports `5183`, `5184`, `5185`, `5432`).
3. **[`PROJECT_GUIDE.md`](./for-hackathon/PROJECT_GUIDE.md)** — End-to-end user manual and architectural concepts.
4. **[`CODE_EXPLANATION.md`](./for-hackathon/CODE_EXPLANATION.md)** — High-level codebase architecture and module explanation.
5. **[`TECHNICAL_DEEP_DIVE.md`](./for-hackathon/TECHNICAL_DEEP_DIVE.md)** — Deep dive into AST parsing, Knowledge Graph, Bayesian predictions, and event streams.
6. **[`DEMO_SCRIPT.md`](./for-hackathon/DEMO_SCRIPT.md)** — 3-minute and 5-minute winning presentation & live demo runbooks.
7. **[`QA_DOCUMENT.md`](./for-hackathon/QA_DOCUMENT.md)** — Testing matrix, regression suites, and automated verification.
8. **[`DEPLOYMENT_GUIDE.md`](./for-hackathon/DEPLOYMENT_GUIDE.md)** — Local, Docker, and Cloud deployment instructions.
9. **[`MARKET_RESEARCH.md`](./for-hackathon/MARKET_RESEARCH.md)** — Competitive landscape (vs Datadog, Sentry, SonarQube, LinearB) and business model.
10. **[`LINKEDIN_POST.md`](./for-hackathon/LINKEDIN_POST.md)** — Ready-to-publish viral post & project announcement template.
11. **[`NOTIFICATION_INTEGRATION_SETUP.md`](./for-hackathon/NOTIFICATION_INTEGRATION_SETUP.md)** — Telegram bot, Slack webhook, and alerting setup.

---

### 💼 [`for-interview/`](./for-interview/)

Forensic interview preparation, system design blueprints, and file-by-file deep dives:

1. **[`01_PROJECT_OVERVIEW_STORY.md`](./for-interview/01_PROJECT_OVERVIEW_STORY.md)** — The 2-minute elevator pitch and technical origin story.
2. **[`02_TECHNICAL_ARCHITECTURE.md`](./for-interview/02_TECHNICAL_ARCHITECTURE.md)** — Monorepo layout, microservices vs modular monolith, and data flow.
3. **[`03_TOUGH_QNA_CHEAT_SHEET.md`](./for-interview/03_TOUGH_QNA_CHEAT_SHEET.md)** — Top 25 challenging engineering questions with crisp answers.
4. **[`04_CODE_WALKTHROUGH_SCRIPT.md`](./for-interview/04_CODE_WALKTHROUGH_SCRIPT.md)** — Live technical code walkthrough script for technical recruiters and staff engineers.
5. **[`05_SYSTEM_DESIGN_DIAGRAMS.md`](./for-interview/05_SYSTEM_DESIGN_DIAGRAMS.md)** — Mermaid diagrams for Causal Graph, Event Ingestion, State Machines, and DB schemas.
6. **[`06_BACKEND_DEEP_DIVE.md`](./for-interview/06_BACKEND_DEEP_DIVE.md)** — FastAPI, PostgreSQL, SQLAlchemy 2.0 async, Pydantic, and Graph algorithms.
7. **[`07_FRONTEND_DEEP_DIVE.md`](./for-interview/07_FRONTEND_DEEP_DIVE.md)** — React 19, Vite, TanStack Query, SVG-based Radial Causal Layout, and Tailwind design tokens.
8. **[`08_EXTREME_QNA_MASTERFILE.md`](./for-interview/08_EXTREME_QNA_MASTERFILE.md)** — 50+ deep-dive questions covering concurrency, graph cycles, scalability, and security.
9. **[`09_FILE_BY_FILE_EXPLANATION.md`](./for-interview/09_FILE_BY_FILE_EXPLANATION.md)** — Comprehensive index explaining the responsibility of every critical file in the repo.
10. **[`10_PRESENTATION_GUIDE.md`](./for-interview/10_PRESENTATION_GUIDE.md)** — Behavioral and technical leadership guide for presenting complex systems.
11. **[`11_PORTFOLIO_ONE_PAGER.html`](./for-interview/11_PORTFOLIO_ONE_PAGER.html)** — Self-contained interactive HTML portfolio card.

---

## ⚡ Canonical Ports & Topology

| Service        | Port   | Tech Stack                                   | Role                                                   |
| -------------- | ------ | -------------------------------------------- | ------------------------------------------------------ |
| **Dashboard**  | `5183` | React 19, Vite, Tailwind CSS, TanStack Query | Interactive Intelligence UI & Graph Canvas             |
| **API**        | `5184` | FastAPI, Python 3.12, SQLAlchemy, Pyright    | Knowledge Graph Engine, REST APIs, ML/Risk models      |
| **Daemon**     | `5185` | Node.js, TypeScript, Chokidar, AST Parsers   | Real-time file & event watcher, local security scanner |
| **PostgreSQL** | `5432` | PostgreSQL 16                                | Relational entities, Graph nodes, telemetry tables     |
