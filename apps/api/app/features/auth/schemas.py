"""
Pydantic schemas for Authentication and User management.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserResponse(BaseModel):
    """Public user identity response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str | None = None
    avatar_url: str | None = None
    is_verified: bool
    provider: str
    created_at: datetime


class RegisterRequest(BaseModel):
    """User registration via email and password."""

    email: EmailStr
    password: str = Field(min_length=8, description="Password must be at least 8 characters.")
    full_name: str | None = None


class VerifyEmailRequest(BaseModel):
    """Verification code submission."""

    email: EmailStr
    code: str = Field(min_length=6, max_length=6, description="6-digit verification code.")


class ResendCodeRequest(BaseModel):
    """Request a fresh 6-digit verification code."""

    email: EmailStr


class LoginRequest(BaseModel):
    """User login with email and password."""

    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    """Google OAuth login via GCP Google Identity Services credential (ID token)."""

    credential: str = Field(description="Google ID Token from Google Identity Services SDK.")


class TokenResponse(BaseModel):
    """Access token along with user payload."""

    access_token: str
    token_type: str = "bearer"  # noqa: S105
    user: UserResponse


class MessageResponse(BaseModel):
    """Generic status response."""

    message: str
