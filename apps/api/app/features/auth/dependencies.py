"""
Authentication dependencies for FastAPI routes.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.logging import get_logger
from app.core.redis import RedisClientType, get_redis
from app.features.auth.models import User
from app.features.auth.service import AuthService

logger = get_logger("auth_dependencies")
security_bearer = HTTPBearer(auto_error=False)


def get_auth_service(
    db: AsyncSession = Depends(get_db),
    redis: RedisClientType = Depends(get_redis),
    settings: Settings = Depends(get_settings),
) -> AuthService:
    """Provides an initialized AuthService instance."""
    return AuthService(db=db, redis=redis, settings=settings)


@dataclass
class AuthenticatedContext:
    user: User
    session_id: str
    token: str


async def get_current_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
    auth_service: AuthService = Depends(get_auth_service),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedContext:
    """
    Validates the bearer token, verifies session presence in Redis,
    and returns the authenticated user and active session ID.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    user_id_str: str | None = payload.get("sub")
    session_id: str | None = payload.get("session_id")

    if not user_id_str or not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    # 1. Validate active session against Redis
    session_data = await auth_service.get_session(user_id=user_id, session_id=session_id)
    if session_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or was revoked. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Fast-path: reconstitute User directly from in-memory Redis session (0 database queries)
    user: User | None = None
    email_val = session_data.get("email")
    if isinstance(email_val, str) and "is_verified" in session_data:
        try:
            created_at_raw = session_data.get("created_at")
            if isinstance(created_at_raw, str):
                try:
                    created_at = datetime.fromisoformat(created_at_raw)
                except ValueError:
                    created_at = datetime.now(UTC)
            else:
                created_at = datetime.now(UTC)

            full_name = session_data.get("full_name")
            avatar_url = session_data.get("avatar_url")
            provider = session_data.get("provider")
            google_id = session_data.get("google_id")

            user = User(
                id=user_id,
                email=email_val,
                full_name=str(full_name) if full_name is not None else None,
                avatar_url=str(avatar_url) if avatar_url is not None else None,
                is_verified=bool(session_data.get("is_verified", False)),
                provider=str(provider) if provider is not None else "local",
                google_id=str(google_id) if google_id is not None else None,
                created_at=created_at,
                updated_at=created_at,
            )
        except Exception as exc:
            logger.warning(
                "user_reconstitution_from_redis_failed",
                extra={"error": str(exc)},
            )
            user = None

    # 3. Fallback: query PostgreSQL if session profile was incomplete, and warm up Redis
    if user is None:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Warm up the full session in Redis for subsequent instantaneous requests
        await auth_service.cache_user_session(user_id=user_id, session_id=session_id, user=user)

    return AuthenticatedContext(user=user, session_id=session_id, token=token)


async def get_current_user(
    context: AuthenticatedContext = Depends(get_current_context),
) -> User:
    """Dependency that returns the current authenticated User."""
    return context.user
