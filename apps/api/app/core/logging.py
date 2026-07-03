"""
Structured logging configuration.

Emits JSON-formatted log records so logs are machine-parseable in any
environment (local, Docker, or a future log aggregator). Never use bare
`print()` in application code — always go through `get_logger`.
"""

import logging
import sys
from typing import Any

from app.core.config import get_settings


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        import json

        payload: dict[str, Any] = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
        }

        # Merge any `extra={...}` fields passed to the log call.
        reserved = set(vars(logging.makeLogRecord({})).keys())
        for key, value in vars(record).items():
            if key not in reserved and key != "message":
                payload[key] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str)


def _configure_root_logger() -> None:
    settings = get_settings()
    root = logging.getLogger("vibepulse")
    if root.handlers:
        return  # already configured — avoid duplicate handlers on reload

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root.addHandler(handler)
    root.setLevel(settings.log_level.upper())
    root.propagate = False


def get_logger(name: str) -> logging.Logger:
    _configure_root_logger()
    return logging.getLogger(f"vibepulse.{name}")
