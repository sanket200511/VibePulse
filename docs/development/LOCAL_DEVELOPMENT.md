# DepRadar — Local Development Guide

This guide documents the canonical local-development architecture, prerequisites, setup procedure, service ports, and troubleshooting steps for running DepRadar without Docker.

---

## 1. Architecture & Canonical Ports

DepRadar is designed to run natively and deterministically on the developer host machine:

| Component           | Technology                        | Canonical Port          | Command                  |
| ------------------- | --------------------------------- | ----------------------- | ------------------------ |
| **PostgreSQL**      | Native PostgreSQL (local service) | `localhost:5432`        | Windows Service / Native |
| **FastAPI Backend** | Python 3.12 + FastAPI + Uvicorn   | `http://localhost:5184` | `pnpm run dev:api`       |
| **Dashboard**       | React + TypeScript + Vite         | `http://localhost:5183` | `pnpm run dev:dashboard` |
| **Daemon**          | Node.js + TypeScript + Chokidar   | `http://localhost:5185` | `pnpm run dev:daemon`    |

> [!NOTE]
>
> - The **Dashboard** runs on `http://localhost:5183` and automatically proxies `/api`, `/sessions`, `/events`, `/projects`, `/investigation`, `/health`, and `/ws` to FastAPI on port `5184`.
> - The **Daemon** pushes development telemetry events to `http://localhost:5184/events` and exposes a local health/control gate on port `5185`.
> - **Docker is NOT required** for standard local development.

---

## 2. Prerequisites

Ensure the following native toolchain is installed and accessible in your `PATH`:

- **Node.js**: `v20.0.0` or higher (`node --version`)
- **pnpm**: `v9.0.0` or higher (`pnpm --version`)
- **Python**: `3.12.x` (`python --version`)
- **uv**: Astral uv Python package manager (`uv --version`)
- **PostgreSQL**: Local PostgreSQL 15+ service running on port `5432`

---

## 3. Database Setup

1. Ensure your local PostgreSQL service is running on standard port `5432`.
2. Ensure the `vibepulse` database and user exist:
   ```sql
   CREATE USER vibepulse WITH PASSWORD 'vibepulse_dev';
   CREATE DATABASE vibepulse OWNER vibepulse;
   GRANT ALL PRIVILEGES ON DATABASE vibepulse TO vibepulse;
   ```
3. Database connection string:
   ```env
   DATABASE_URL=postgresql+asyncpg://vibepulse:vibepulse_dev@localhost:5432/vibepulse
   ```

---

## 4. Initial Project Setup

To configure all `.env` files, install JavaScript/Python dependencies, and apply database migrations:

```powershell
pnpm setup
```

This command executes `scripts/setup.mjs`, which:

1. Verifies `git`, `node`, `pnpm`, and `uv` prerequisites.
2. Creates `.env` files from `.env.example` in root, `apps/api`, and `apps/daemon` if not already present.
3. Installs monorepo npm packages (`pnpm install`) and Python virtual environments (`uv sync`).
4. Verifies PostgreSQL reachability and applies all Alembic migrations (`uv run alembic upgrade head`).
5. Executes `node scripts/doctor.mjs` to confirm overall environment health.

---

## 5. Starting the Development Environment

To start all services simultaneously with a single command:

```powershell
pnpm dev
```

This runs the structured development supervisor providing:

- Structured logs formatted as `[TIME] [SERVICE] [LEVEL] MESSAGE`
- `[API]` FastAPI backend on `http://localhost:5184`
- `[DASHBOARD]` React/Vite dashboard on `http://localhost:5183`
- `[DAEMON]` Filesystem observation daemon on port `5185`

### Checking Instant Stack Status

To inspect the live status of all services in sub-second time without restarting:

```powershell
pnpm dev:status
# or
pnpm status
```

### Verbose / Debug Mode

To inspect all unfiltered subprocess output:

```powershell
VIBEPULSE_LOG_LEVEL=debug pnpm dev
# or
pnpm dev --debug
```

### Starting Individual Services

You can also run services independently in separate terminal tabs:

```powershell
# 1. Start API only
pnpm run dev:api

# 2. Start Dashboard only
pnpm run dev:dashboard

# 3. Start Daemon only (uses WATCH_ROOT from apps/daemon/.env)
pnpm run dev:daemon

# 4. Start Daemon targeting a specific project via CLI flag
pnpm run dev:daemon -- --watch "D:\Projects\Animal Disease Prediction"
```

---

## 6. Configuring & Switching Watched Projects

DepRadar supports dynamic observation of arbitrary developer projects on your filesystem without modifying application source code:

1. **Option A — Via Environment Variable**:
   In `apps/daemon/.env`, set:

   ```env
   WATCH_ROOT=D:\Projects\Animal Disease Prediction
   ```

   Restart the daemon (`pnpm run dev:daemon` or `pnpm dev`).

2. **Option B — Via CLI Argument (`--watch` / `-w`)**:
   Pass the target directory directly when launching the daemon:
   ```powershell
   pnpm run dev:daemon -- --watch "D:\Projects\Animal Disease Prediction"
   ```

### How Dynamic Project Identity Works:

- **Canonical Identity**: Paths are normalized deterministically across platforms (handling Windows drive letters `D:\`, path separators, and NTFS filesystem casing).
- **Zero Configuration**: When the daemon starts or when file events occur, the backend automatically creates or reuses the corresponding `Project` and `Session` in PostgreSQL.
- **Multi-Project Isolation**: Multiple projects and their distinct sessions coexist cleanly in the database. Switching the daemon's observation target preserves prior project history while automatically establishing active observation on the new project.

---

## 7. Diagnostic & Health Verification

Run the environment doctor at any time:

```powershell
pnpm doctor
```

Output:

```
=========================
    DepRadar Doctor
=========================

[PASS] Node.js
[PASS] pnpm
[PASS] Python
[PASS] uv
[PASS] API configuration (.env)
[PASS] Daemon configuration (.env)
[PASS] PostgreSQL Status & Schema

Overall:
DepRadar environment is READY.
```

---

## 7. Troubleshooting Common Issues

### Issue: `PostgreSQL is not reachable at localhost:5432`

- **Cause**: The local PostgreSQL Windows service is stopped or listening on a non-standard port.
- **Fix**: Start the PostgreSQL service via Windows Services (`services.msc`) or `net start postgresql-x64-16`.

### Issue: `Database schema is not initialized (missing tables)`

- **Cause**: Alembic migrations have not been applied to the local database.
- **Fix**: Run:
  ```powershell
  cd apps/api
  uv run alembic upgrade head
  ```

### Issue: Port 5184 / 5183 / 5185 is already in use (`EADDRINUSE` / `WinError 10048`)

- **Cause**: An orphan node/python process is still holding the port.
- **Fix**: Check and terminate holding processes:
  ```powershell
  Get-NetTCPConnection -LocalPort 5184,5183,5185 -ErrorAction SilentlyContinue | Select-Object LocalPort,OwningProcess
  Stop-Process -Id <PID> -Force
  ```

### Issue: Need a clean slate database reset

- **Warning**: This drops and re-creates all tables in the `vibepulse` database.
- **Fix**:
  ```powershell
  pnpm run db:reset
  ```

---

## 8. Verification Checklist

- [x] Local PostgreSQL service running on `localhost:5432`
- [x] `pnpm doctor` passes with all checks green
- [x] `uv run alembic current` reports `0005 (head)`
- [x] `pnpm dev` starts API, Dashboard, and Daemon exactly once
- [x] `http://localhost:5183` loads the DepRadar dashboard
- [x] WebSocket live streams (`/ws/events`, `/ws/sessions`) connect without errors

---

## 9. Project Lifecycle & Hygiene Management

DepRadar establishes a strict distinction between **Persistent Projects** and **Ephemeral Projects**:

- **Persistent Projects** (e.g. `D:\Projects\Dabba`): Persist durably across system restarts, demo runs, and test suites.
- **Ephemeral Test/Demo Projects**: Created with temporary directory roots during integration tests or live demos. All test and demo scripts execute within `try ... finally` blocks and guarantee deletion via `DELETE /api/projects/:id?force=true`.

### Inspecting Database Project Hygiene (Dry Run)

To inspect registered projects and review ephemeral vs persistent classifications without modifying the database:

```powershell
pnpm cleanup:ephemeral
```

### Performing Controlled Ephemeral Cleanup

To safely remove all confirmed ephemeral and disposable projects while strictly protecting persistent projects:

```powershell
pnpm cleanup:ephemeral:confirm
```
