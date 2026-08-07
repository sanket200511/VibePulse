# Installation Guide

Welcome to the VibePulse installation guide. This document covers everything you need to know to get VibePulse running locally for development and testing.

## Prerequisites

Ensure you have the following installed on your machine before beginning:

| Tool                                      | Version   | Purpose                                            |
| ----------------------------------------- | --------- | -------------------------------------------------- |
| [Node.js](https://nodejs.org/)            | `>= 20.x` | Runtime for Dashboard & Daemon                     |
| [pnpm](https://pnpm.io/)                  | `>= 9.x`  | Monorepo package management                        |
| [Python](https://python.org/)             | `>= 3.12` | Runtime for FastAPI backend                        |
| [uv](https://docs.astral.sh/uv/)          | `latest`  | Extremely fast Python dependency resolver          |
| [PostgreSQL](https://www.postgresql.org/) | `16.x`    | Primary database (Local installation on port 5432) |

---

## Step 1: Clone the Repository

Clone the VibePulse source code to your local machine:

```bash
git clone https://github.com/sanket200511/VibePulse.git
cd VibePulse
```

## Step 2: Install Node Dependencies

VibePulse is a Turborepo monorepo using `pnpm` workspaces. Install the root and workspace dependencies:

```bash
pnpm install
```

## Step 3: Configure Environment Variables

The system relies on specific environment variables for ports, secrets, and database credentials.

Copy the example environment files to their active locations:

```bash
# Root environment
cp .env.example .env

# App environments
cp apps/api/.env.example apps/api/.env
cp apps/dashboard/.env.example apps/dashboard/.env
cp apps/daemon/.env.example apps/daemon/.env
```

> **IMPORTANT:** Open `apps/api/.env` and paste your Redis Cloud URL into the `REDIS_URL` variable.

## Step 4: Install Python Dependencies

The backend API is built with FastAPI and requires Python 3.12. We use `uv` for dependency management.

```bash
cd apps/api
uv sync
cd ../..
```

## Step 5: Database Setup & Migrations

Ensure your local PostgreSQL instance is running on port 5432.
The default `.env` assumes:

- User: `vibepulse`
- Password: `vibepulse_dev`
- Database: `vibepulse`

You may need to create this database and user locally if they do not exist.

Run the Alembic migrations to set up the database schema:

```bash
cd apps/api
uv run alembic upgrade head
cd ../..
```

## Step 6: Start the Applications

Run the applications locally. We recommend opening three separate terminals:

**Terminal 1 (Dashboard):**

```bash
pnpm --filter @vibepulse/dashboard dev
```

**Terminal 2 (API):**

```bash
cd apps/api
uv run uvicorn app.main:app --reload --port 8080
```

**Terminal 3 (Daemon):**

```bash
pnpm --filter @vibepulse/daemon dev
```

You should see:

1. **Dashboard**: `http://localhost:3000` (React/Vite)
2. **API**: `http://localhost:8080` (FastAPI)
3. **Daemon**: `http://localhost:9000/health` (Node.js observer)

---

## Troubleshooting

### Port 3000 / 8080 is already in use

If you encounter `EACCES` or `EADDRINUSE` errors, ensure no other Vite or Uvicorn servers are running.

```bash
# Windows
taskkill /F /IM node.exe
taskkill /F /IM python.exe
```

### Missing PostgreSQL connection

If the API fails to boot with a `ConnectionRefusedError`, verify that PostgreSQL is running locally on port `5432` and the credentials in `apps/api/.env` match your local setup.

### Missing Redis connection

Ensure you have replaced `<PASTE_YOUR_REDIS_CLOUD_URL_HERE>` in `apps/api/.env` with a valid Redis Cloud URL.

### UI changes not syncing

Ensure you ran `pnpm install` in the root directory. Because VibePulse uses workspaces, UI primitives (`@vibepulse/ui`) must be linked properly via `pnpm`.
