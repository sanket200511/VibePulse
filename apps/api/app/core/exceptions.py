"""
Domain exceptions.

All application-specific exceptions derive from VibePulseError so callers
can catch them with a single except clause when needed.
"""


class VibePulseError(Exception):
    """Base exception for all VibePulse domain errors."""

    def __init__(self, message: str, *, code: str | None = None) -> None:
        super().__init__(message)
        self.code = code


class NotFoundError(VibePulseError):
    """Raised when a requested resource does not exist."""


class ConflictError(VibePulseError):
    """Raised when an operation conflicts with existing state."""


class ValidationError(VibePulseError):
    """Raised when domain validation rules are violated."""
