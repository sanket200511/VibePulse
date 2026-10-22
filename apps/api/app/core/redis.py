"""
Redis connection and session management.

Provides an async Redis client backed by the application's REDIS_URL setting.
Includes an in-memory fallback for local development/testing when Redis is not active.
"""

from __future__ import annotations

import time
from collections.abc import AsyncGenerator

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


RedisClientType = Redis | InMemoryRedisFallback
_redis_client: RedisClientType | None = None
_fallback_instance: InMemoryRedisFallback | None = None


def get_fallback_client() -> InMemoryRedisFallback:
    """Returns singleton in-memory fallback client."""
    global _fallback_instance
    if _fallback_instance is None:
        _fallback_instance = InMemoryRedisFallback()
    return _fallback_instance


def get_redis_client() -> RedisClientType:
    """Returns a singleton async Redis client instance."""
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = aioredis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_timeout=1.0,
                socket_connect_timeout=1.0,
            )
        except Exception as exc:
            logger.warning("redis_init_fallback", extra={"error": str(exc)})
            _redis_client = get_fallback_client()
    return _redis_client


async def get_redis() -> AsyncGenerator[RedisClientType, None]:
    """FastAPI dependency yielding an async Redis connection."""
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
