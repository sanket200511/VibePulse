# VibePulse API

FastAPI backend for the VibePulse Developer Observability Platform.

See the repository root [README](../../README.md) and [CLAUDE.md](../../CLAUDE.md) for
architecture and contribution guidelines.

## Development

```bash
uv sync
uv run uvicorn app.main:app --reload
```

## Tests

```bash
uv run pytest
```

Tests require a reachable Postgres instance (`DATABASE_URL`), matching the one started by
`docker compose up -d` at the repository root.
