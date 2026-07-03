# ─────────────────────────────────────────────────────────────────────────────
# VibePulse API – Dockerfile
# Multi-stage build: builder installs deps, runtime runs the app.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: builder ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# Copy dependency manifests first (layer-cache friendly)
COPY pyproject.toml ./

# Install dependencies into a virtual environment
RUN uv sync --no-dev --frozen

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy uv binary (needed to run the app via uv)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Copy installed virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy application source
COPY . .

# Ensure the venv is on PATH
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
