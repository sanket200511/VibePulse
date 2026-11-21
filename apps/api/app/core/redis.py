"""
Redis / Upstash connection and session management.

Supports:
1. Upstash REST API (via UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN)
2. Standard Redis TCP (via REDIS_URL, e.g. rediss://default:...@...upstash.io:6379)
3. In-memory fallback for offline development or testing
"""

from __future__ import annotations

import time
from collections.abc import AsyncGenerator

import httpx
import redis.asyncio as aioredis
from redis.asyncio import Redis

from app.core.config import get_settings
from app.core.logging import get_logger

settings = get_settings()
logger = get_logger("redis")


class InMemoryRedisFallback:
    """Fallback storage if Redis server is unreachable in development or tests."""

    def __init__(self) -> None:
        self.is_fallback = True
        self.client_type = "in_memory"
        self._store: dict[str, tuple[str, float | None]] = {}

    async def get(self, key: str) -> str | None:
        if key in self._store:
            val, expiry = self._store[key]
            if expiry is None or expiry > time.time():
                return val
            del self._store[key]
        return None

    async def set(self, key: str, value: str, ex: int | None = None) -> bool:
        expiry = (time.time() + ex) if ex else None
        self._store[key] = (str(value), expiry)
        return True

    async def delete(self, *keys: str) -> int:
        count = 0
        for k in keys:
            if k in self._store:
                del self._store[k]
                count += 1
        return count

    async def exists(self, key: str) -> int:
        val = await self.get(key)
        return 1 if val is not None else 0

    async def ping(self) -> bool:
        return True

    async def close(self) -> None:
        pass


class UpstashRestRedisClient:
    """Async Redis client communicating via Upstash HTTP/REST API."""

    def __init__(self, rest_url: str, rest_token: str) -> None:
        self.is_fallback = False
        self.client_type = "upstash_rest"
        self.url = rest_url.rstrip("/")
        self.token = rest_token
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=5.0, headers=self.headers)
        return self._client

    async def get(self, key: str) -> str | None:
        client = self._get_client()
        resp = await client.post(self.url, json=["GET", key])
        resp.raise_for_status()
        data = resp.json()
        return data.get("result")

    async def set(self, key: str, value: str, ex: int | None = None) -> bool:
        client = self._get_client()
        cmd: list[object] = ["SET", key, str(value)]
        if ex:
            cmd.extend(["EX", ex])
        resp = await client.post(self.url, json=cmd)
        resp.raise_for_status()
        return True

    async def delete(self, *keys: str) -> int:
        if not keys:
            return 0
        client = self._get_client()
        resp = await client.post(self.url, json=["DEL", *keys])
        resp.raise_for_status()
        data = resp.json()
        return int(data.get("result", 0))

    async def exists(self, key: str) -> int:
        client = self._get_client()
        resp = await client.post(self.url, json=["EXISTS", key])
        resp.raise_for_status()
        data = resp.json()
        return int(data.get("result", 0))

    async def ping(self) -> bool:
        client = self._get_client()
        resp = await client.post(self.url, json=["PING"])
        resp.raise_for_status()
        return resp.json().get("result") == "PONG"

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()


RedisClientType = Redis | UpstashRestRedisClient | InMemoryRedisFallback
_redis_client: RedisClientType | None = None
_fallback_instance: InMemoryRedisFallback | None = None


def get_fallback_client() -> InMemoryRedisFallback:
    """Returns singleton in-memory fallback client."""
    global _fallback_instance
    if _fallback_instance is None:
        _fallback_instance = InMemoryRedisFallback()
    return _fallback_instance


def get_redis_client() -> RedisClientType:
    """Returns a singleton Redis client instance (Upstash REST, TCP, or in-memory fallback)."""
    global _redis_client
    if _redis_client is None:
        # 1. Check if Upstash REST credentials are provided
        if settings.upstash_redis_rest_url and settings.upstash_redis_rest_token:
            logger.info("redis_init_upstash_rest", extra={"url": settings.upstash_redis_rest_url})
            _redis_client = UpstashRestRedisClient(
                settings.upstash_redis_rest_url,
                settings.upstash_redis_rest_token,
            )
            return _redis_client

        # 2. Check standard Redis TCP connection string
        redis_url = settings.redis_url.strip() if settings.redis_url else ""
        if redis_url.startswith("rediss://") or redis_url.startswith("redis://"):
            try:
                _redis_client = aioredis.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_timeout=5.0,
                    socket_connect_timeout=5.0,
                )
                logger.info("redis_init_tcp", extra={"scheme": redis_url.split(":")[0]})
                return _redis_client
            except Exception as exc:
                logger.warning("redis_init_tcp_failed", extra={"error": str(exc)})
                _redis_client = get_fallback_client()
                return _redis_client

        _redis_client = get_fallback_client()
    return _redis_client


async def get_redis() -> AsyncGenerator[RedisClientType, None]:
    """FastAPI dependency yielding a connected Redis client."""
    global _redis_client
    client = get_redis_client()
    if not getattr(client, "is_fallback", False):
        try:
            await client.ping()  # type: ignore[union-attr]
        except Exception:
            logger.info("redis_unreachable_switching_to_fallback")
            client = get_fallback_client()
            _redis_client = client
    yield client
