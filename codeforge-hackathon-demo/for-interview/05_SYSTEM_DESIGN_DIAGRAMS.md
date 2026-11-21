# 📐 05. System Design Diagrams & Data Flow Models

This document contains Mermaid diagrams illustrating system architecture, state machines, data flow, and graph traversal logic.

---

## 🗺️ 1. High-Level Component & Network Flow

```mermaid
flowchart TD
    subgraph Local Dev Workstation
        IDE["VS Code / IDE Filesystem"]
        Daemon["VibePulse Daemon (:5185)<br/>Chokidar + AST Scanner"]
    end

    subgraph Core Cloud / Server Layer
        API["FastAPI App Server (:5184)<br/>Knowledge Graph Engine"]
        DB[(PostgreSQL 16 :5432<br/>SQLAlchemy AsyncPG)]
    end

    subgraph Frontend Tier
        Dashboard["React 19 SPA (:5183)<br/>SVG Radial Canvas + Inspector"]
    end

    IDE -->|FS Events| Daemon
    Daemon -->|HTTP POST /events| API
    API <-->|SQL Queries| DB
    Dashboard <-->|REST GET /knowledge-graph| API
    Dashboard <-->|SSE Telemetry Stream| API
```

---

## ⚡ 2. Root Cause Traversal State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle: Selected Entity
    Idle --> RootCauseRequested: Click "Trace Root Cause"
    RootCauseRequested --> Pathfinding: Fetch BFS Traversal Path
    Pathfinding --> Step1: Highlight Step 1 (Observed Event)
    Step1 --> Step2: User Clicks "Next Step" (Security Finding)
    Step2 --> Step3: User Clicks "Next Step" (Incident)
    Step3 --> Step4: User Clicks "Next Step" (Resolution)
    Step4 --> Idle: Reset / Clear Traversal
```

---

## 📊 3. Bayesian Risk & Health Calculation Flow

```mermaid
flowchart LR
    A[AST Edit Event] --> B{AST Guardian Rule Check}
    B -->|Violation Detected| C[Security Finding Node: SEC001]
    C --> D[Add +15 Risk Points]
    D --> E[Update Security Dimension Score: 85/100]
    E --> F[Update Overall Health Score: 95/100]
    F --> G[Re-render Dashboard Health Pill]
```
