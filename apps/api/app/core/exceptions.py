"""
Domain exceptions.

All application-specific exceptions derive from DepRadarError so callers
can catch them with a single except clause when needed.
"""


class DepRadarError(Exception):
    """Base exception for all DepRadar domain errors."""

    def __init__(self, message: str, *, code: str | None = None) -> None:
        super().__init__(message)
        self.code = code


class NotFoundError(DepRadarError):
    """Raised when a requested resource does not exist."""


class ConflictError(DepRadarError):
    """Raised when an operation conflicts with existing state."""


class ValidationError(DepRadarError):
    """Raised when domain validation rules are violated."""
