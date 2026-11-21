# 🛠️ VibePulse — Start & Setup Guide

This guide walks you through setting up and running VibePulse locally on any machine (macOS, Linux, Windows).

---

## 📋 Prerequisites

Ensure the following tools are installed on your machine:

- **Node.js**: `v20.x` or `v22.x`
- **pnpm**: `v9.x` (`npm i -g pnpm`)
- **Python**: `3.12+` with `uv` (`curl -LsSf https://astral.sh/uv/install.sh | sh` or `pip install uv`)
- **Docker & Docker Compose**: (For PostgreSQL) or a local PostgreSQL instance running on port `5432`.

---

## ⚙️ Environment Configuration

VibePulse follows strict canonical port assignments across all configuration files:

| Service         | Host Port | Env File              | Key Configuration                                                              |
| --------------- | --------- | --------------------- | ------------------------------------------------------------------------------ |
| **PostgreSQL**  | `5432`    | `.env`                | `DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/vibepulse` |
| **API Backend** | `5184`    | `apps/api/.env`       | `PORT=5184`, `CORS_ORIGINS=http://localhost:5183`                              |
| **Dashboard**   | `5183`    | `apps/dashboard/.env` | `VITE_API_URL=http://localhost:5184`, `PORT=5183`                              |
| **Daemon**      | `5185`    | `apps/daemon/.env`    | `PORT=5185`, `API_URL=http://localhost:5184`                                   |

---

## 🏃 Running the Full Stack

### Option A: One-Command Startup (Recommended)

```powershell
# In root directory:
pnpm dev
```

This command leverages Turborepo to concurrently start:

1. `apps/api` on `http://localhost:5184` (Uvicorn + FastAPI with auto-reload).
2. `apps/daemon` on `http://localhost:5185` (TypeScript watch runner).
3. `apps/dashboard` on `http://localhost:5183` (Vite dev server).

---

### Option B: Step-by-Step Manual Startup

#### Step 1: Database

```bash
docker-compose up -d postgres
```

#### Step 2: API Backend

```bash
cd apps/api
uv venv
# Activate virtualenv (.venv/bin/activate on Mac/Linux or .venv\Scripts\activate on Windows)
uv run uvicorn app.main:app --host 0.0.0.0 --port 5184 --reload
```

#### Step 3: Daemon

```bash
cd apps/daemon
pnpm dev
```

#### Step 4: Dashboard

```bash
cd apps/dashboard
pnpm dev --port 5183
```

---

## 🧪 Validating Stack Health

Run this quick test script to verify all services:

```bash
# Check API Health
curl http://localhost:5184/health
# Response: {"status":"healthy","database":"connected","version":"0.0.1"}

# Check Dashboard
curl -I http://localhost:5183
# Response: HTTP/1.1 200 OK
```

---

## 🎯 Target Demo Project

Navigate to the canonical seminar demo project in your browser:

```
http://localhost:5183/projects/334351d3-4aeb-4bc4-9387-f22e236acda8/knowledge-graph
```
