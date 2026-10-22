"""
Authentication dependencies for FastAPI routes.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.redis import RedisClientType, get_redis
from app.features.auth.models import User
from app.features.auth.service import AuthService

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

    # Validate active session against Redis
    is_active_session = await auth_service.validate_session(user_id=user_id, session_id=session_id)
    if not is_active_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or was revoked. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user from database
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthenticatedContext(user=user, session_id=session_id, token=token)


async def get_current_user(
    context: AuthenticatedContext = Depends(get_current_context),
) -> User:
    """Dependency that returns the current authenticated User."""
    return context.user
