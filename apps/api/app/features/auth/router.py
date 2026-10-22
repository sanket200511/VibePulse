"""
Authentication API endpoints.

Covers email/password registration, 6-digit email verification, Google OAuth,
session checking, and Redis-backed logout.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.features.auth.dependencies import (
    AuthenticatedContext,
    get_auth_service,
    get_current_context,
    get_current_user,
)
from app.features.auth.models import User
from app.features.auth.schemas import (
    GoogleLoginRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResendCodeRequest,
    TokenResponse,
    UserResponse,
    VerifyEmailRequest,
)
from app.features.auth.service import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    """Register a new user account with email and password and dispatch verification code."""
    res = await service.register_user(payload)
    return MessageResponse(message=res["message"])


@router.post("/verify-email", response_model=TokenResponse)
async def verify_email(
    payload: VerifyEmailRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """Validate 6-digit email verification code and return an active authenticated session."""
    return await service.verify_email_code(email=payload.email, code=payload.code)


@router.post("/resend-code", response_model=MessageResponse)
async def resend_code(
    payload: ResendCodeRequest,
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    """Request a new 6-digit verification code if the previous one expired."""
    res = await service.resend_verification_code(email=payload.email)
    return MessageResponse(message=res["message"])


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """Authenticate with email and password."""
    return await service.login_with_password(payload)


@router.post("/google", response_model=TokenResponse)
async def google_login(
    payload: GoogleLoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """Sign in or register using Google Identity Services (GCP) ID Token credential."""
    return await service.login_with_google(payload)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    context: AuthenticatedContext = Depends(get_current_context),
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    """Revoke active JWT session from Redis."""
    await service.revoke_session(user_id=context.user.id, session_id=context.session_id)
    return MessageResponse(message="Successfully signed out.")


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: User = Depends(get_current_user),
) -> UserResponse:
    """Retrieve currently authenticated user profile."""
    return UserResponse.model_validate(user)
