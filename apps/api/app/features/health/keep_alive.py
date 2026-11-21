"""
Background self-ping task to manage Render free-tier instance dormancy.

Render free tier web services spin down after ~15 minutes of inactivity.
When `RENDER_KEEP_ALIVE=true`, this task periodically pings the public
health check URL (e.g. https://vibepulse-api.onrender.com/health) so Render's
inbound router detects activity and keeps the instance warm.

When `RENDER_KEEP_ALIVE=false` (default), this task remains idle to
conserve Render's monthly 750 free-tier compute hours. If asleep, incoming
requests from the dashboard or users automatically trigger a spin-up.
"""

import asyncio

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("keep_alive")


async def run_keep_alive_loop() -> None:
    """Periodically ping the external health check URL while keep-alive is enabled."""
    settings = get_settings()

    if not settings.render_keep_alive:
        logger.info(
            "keep_alive_disabled: Render self-ping is inactive to conserve free-tier hours. "
            "Set RENDER_KEEP_ALIVE=true to keep the instance active."
        )
        return

    interval_seconds = max(60, settings.keep_alive_interval_minutes * 60)
    target_url = settings.get_keep_alive_url()

    logger.info(
        f"keep_alive_started: Auto-ping loop active every {settings.keep_alive_interval_minutes}m.",
        extra={"target_url": target_url, "interval_minutes": settings.keep_alive_interval_minutes},
    )

    # Initial brief delay before starting the periodic ping loop
    await asyncio.sleep(10)

    async with httpx.AsyncClient(timeout=20.0) as client:
        while True:
            try:
                response = await client.get(target_url)
                logger.info(
                    "keep_alive_ping_success",
                    extra={"target_url": target_url, "status_code": response.status_code},
                )
            except asyncio.CancelledError:
                logger.info("keep_alive_cancelled")
                raise
            except Exception as exc:
                logger.warning(
                    f"keep_alive_ping_failed: {exc}",
                    extra={"target_url": target_url},
                )

            await asyncio.sleep(interval_seconds)
