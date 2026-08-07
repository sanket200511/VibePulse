# VibePulse API Reference

The VibePulse backend exposes a RESTful API and WebSocket endpoints for real-time telemetry. The API is built with FastAPI and strictly typed using Pydantic.

## Base URL

When running locally, the API is available at:

```
http://localhost:8000
```

An interactive Swagger UI is available at `/docs`.

---

## 1. Events API

### `POST /events`

Publishes a new development event from the daemon.

**Request Body:**

```json
{
  "session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "project_root": "/Users/dev/my-project",
  "file_path": "src/main.ts",
  "file_name": "main.ts",
  "event_type": "FILE_MODIFIED",
  "language": "typescript",
  "git_branch": "main",
  "timestamp": "2026-08-06T15:00:00Z",
  "daemon_seq": 42
}
```

**Response (201 Created or 200 OK):**
Returns the persisted `DevelopmentEvent`. Deduplication occurs implicitly on `(session_id, file_path, event_type, timestamp)`.

### `GET /events`

Retrieves a paginated list of recent events.

**Query Parameters:**

- `limit` (int, default: 200)

**Response:**
Returns a list of `DevelopmentEventRead` objects, ordered by newest first.

---

## 2. Sessions API

### `GET /sessions`

Retrieves recent development sessions.

**Query Parameters:**

- `limit` (int, default: 50)

**Response:**
Returns a list of `SessionRead` objects.

### `GET /sessions/current`

Returns the currently `ACTIVE` or `IDLE` session.

**Response (200 OK or 404 Not Found):**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "project_root": "/Users/dev/my-project",
  "status": "ACTIVE",
  "event_count": 150,
  "started_at": "2026-08-06T14:30:00Z"
}
```

### `GET /sessions/{session_id}`

Retrieves a specific session by its UUID.

---

## 3. Telemetry & Analytics

### `GET /sessions/{session_id}/timeline`

Generates a chronological timeline projection for a specific session.

**Response:**
Returns a `SessionTimeline` object containing structural markers (`SESSION_START`, `IDLE_GAP`) and grouped file modification insights.

### `GET /sessions/{session_id}/replay`

Reconstructs the session timeline into replayable semantic chapters (`WORK`, `IDLE`, `COMPLETED`).

### `GET /sessions/{session_id}/health`

Computes the Health Engine score for a completed session.
_Note: Returns `409 Conflict` if the session is still active._

### `GET /sessions/{session_id}/profile`

Builds the Developer Intelligence Profile (Insights) for a session.

---

## 4. Observation Control (Daemon Proxy)

### `POST /projects/{project_root}/observation/start`

Idempotently starts file observation on the daemon.

### `POST /projects/{project_root}/observation/stop`

Idempotently stops file observation on the daemon.

---

## 5. WebSockets

Real-time streaming is available over WebSockets. Clients should implement exponential backoff reconnection.

### `ws://localhost:8000/ws/events`

Broadcasts every new `DevelopmentEvent` exactly as it is ingested.

### `ws://localhost:8000/ws/sessions`

Broadcasts full `SessionRead` payloads on state transitions (e.g., `session.started`, `session.updated`, `session.completed`).

```json
{
  "type": "session.updated",
  "session": {
    "id": "...",
    "status": "ACTIVE",
    "event_count": 42
  }
}
```
