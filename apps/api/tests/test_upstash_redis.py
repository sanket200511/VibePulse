"""Tests for Upstash Redis (REST and TCP) integration."""

import httpx
import pytest
from app.core.redis import InMemoryRedisFallback, UpstashRestRedisClient


@pytest.mark.asyncio
async def test_in_memory_fallback_operations() -> None:
    fallback = InMemoryRedisFallback()
    assert await fallback.ping() is True
    assert await fallback.set("test_key", "test_val", ex=60) is True
    assert await fallback.get("test_key") == "test_val"
    assert await fallback.exists("test_key") == 1
    assert await fallback.delete("test_key") == 1
    assert await fallback.get("test_key") is None
    assert await fallback.exists("test_key") == 0


@pytest.mark.asyncio
async def test_upstash_rest_client(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify UpstashRestRedisClient sends expected REST payloads."""
    recorded_requests = []

    class MockTransport(httpx.AsyncBaseTransport):
        async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
            import json

            body = json.loads(request.content.decode("utf-8"))
            recorded_requests.append((request.url.path, body))
            cmd = body[0]
            if cmd == "PING":
                return httpx.Response(200, json={"result": "PONG"})
            elif cmd == "SET":
                return httpx.Response(200, json={"result": "OK"})
            elif cmd == "GET":
                return httpx.Response(200, json={"result": "mock_value"})
            elif cmd == "EXISTS":
                return httpx.Response(200, json={"result": 1})
            elif cmd == "DEL":
                return httpx.Response(200, json={"result": 1})
            return httpx.Response(400, json={"error": "unknown command"})

    client = UpstashRestRedisClient("https://mock-upstash.upstash.io", "mock-token")
    client._client = httpx.AsyncClient(transport=MockTransport())

    assert await client.ping() is True
    assert await client.set("session_123", "data", ex=300) is True
    assert await client.get("session_123") == "mock_value"
    assert await client.exists("session_123") == 1
    assert await client.delete("session_123") == 1
    await client.close()

    assert len(recorded_requests) == 5
    assert recorded_requests[0][1] == ["PING"]
    assert recorded_requests[1][1] == ["SET", "session_123", "data", "EX", 300]
    assert recorded_requests[2][1] == ["GET", "session_123"]
    assert recorded_requests[3][1] == ["EXISTS", "session_123"]
    assert recorded_requests[4][1] == ["DEL", "session_123"]
