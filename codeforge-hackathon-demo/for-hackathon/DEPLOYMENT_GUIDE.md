# 🚢 VibePulse — Deployment & Production Guide

This guide covers local containerization with Docker Compose, cloud deployment options (AWS / GCP / Vercel + Render), environment variables, and production optimization.

---

## 🐳 1. Docker Compose Production Deployment

VibePulse includes multi-stage production Dockerfiles for all microservices:

```yaml
# docker-compose.yml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    container_name: vibepulse-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
      POSTGRES_DB: vibepulse
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build:
      context: .
      dockerfile: docker/api.Dockerfile
    container_name: vibepulse-api
    ports:
      - "5184:5184"
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgrespassword@postgres:5432/vibepulse
      PORT: 5184
    depends_on:
      - postgres

  daemon:
    build:
      context: .
      dockerfile: docker/daemon.Dockerfile
    container_name: vibepulse-daemon
    ports:
      - "5185:5185"
    environment:
      PORT: 5185
      API_URL: http://api:5184
    depends_on:
      - api

volumes:
  pgdata:
```

### Command to Start Containerized Production Stack:

```bash
docker-compose up -d --build
```

---

## ☁️ 2. Cloud Architecture Deployment Options

```mermaid
graph TD
    Client["User Browser"] -->|Static Assets| Vercel["Vercel / Cloudflare Pages (Dashboard :5183)"]
    Vercel -->|API Requests| Render["Render / AWS ECS (FastAPI Backend :5184)"]
    Render <-->|Async Driver| Neon["Neon / AWS RDS (PostgreSQL :5432)"]
    LocalDev["Developer Machine"] -->|Telemetry SSE| Daemon["VibePulse Sidecar Daemon (:5185)"]
    Daemon -->|Secure Ingest| Render
```

---

## 🔐 3. Security & Production Checklist

1. **CORS Headers**: Restrict `CORS_ORIGINS` in `apps/api/.env` to explicit production dashboard domain.
2. **PostgreSQL Connection Pool**: Set `pool_size=20` and `max_overflow=10` in `app/core/config.py`.
3. **Database Migrations**: Run Alembic migrations prior to API container entry:
   ```bash
   uv run alembic upgrade head
   ```
4. **Vite Production Build**: Build optimized JS chunks with tree-shaking:
   ```bash
   pnpm --filter @vibepulse/dashboard build
   ```
