#!/bin/sh
set -e

echo "Running database migrations…"
MAX_RETRIES=10
RETRY_COUNT=0

until alembic upgrade head || [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Migration attempt $RETRY_COUNT/$MAX_RETRIES failed. Retrying in 3 seconds..."
  sleep 3
done

if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
  echo "Database migration failed after $MAX_RETRIES attempts."
  exit 1
fi

PORT="${PORT:-${API_PORT:-5184}}"
echo "Starting API server on port ${PORT}…"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"

