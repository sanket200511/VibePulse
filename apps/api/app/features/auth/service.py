"""
Authentication Service.

Handles password hashing, email verification, Google OAuth credential
validation, JWT issuance, and Redis session lifecycle.
"""

from __future__ import annotations

import asyncio
import json
import secrets
import smtplib
import uuid
from datetime import UTC, datetime, timedelta
from email.message import EmailMessage

import bcrypt
import httpx
import jwt
from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.core.redis import RedisClientType
from app.features.auth.models import EmailVerification, User
from app.features.auth.schemas import (
    GoogleLoginRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

logger = get_logger("auth_service")


class AuthService:
    """Core domain logic for authentication and user lifecycle."""

    def __init__(
        self,
        db: AsyncSession,
        redis: RedisClientType,
        settings: Settings | None = None,
    ) -> None:
        self.db = db
        self.redis = redis
        self.settings = settings or get_settings()

    # ── Password Hashing ─────────────────────────────────────────────────────

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a plaintext password using bcrypt."""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a plaintext password against a bcrypt hash."""
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except (ValueError, TypeError):
            return False

    # ── JWT & Redis Sessions ──────────────────────────────────────────────────

    async def create_user_session(self, user: User) -> TokenResponse:
        """
        Creates an active session in Redis and issues a signed JWT containing
        the user_id and session_id.
        """
        session_id = str(uuid.uuid4())
        now = datetime.now(UTC)
        expires_delta = timedelta(minutes=self.settings.jwt_access_token_expire_minutes)
        exp = now + expires_delta

        payload: dict[str, str | int] = {
            "sub": str(user.id),
            "email": user.email,
            "session_id": session_id,
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
        }

        token = jwt.encode(
            payload,
            self.settings.jwt_secret_key,
            algorithm=self.settings.jwt_algorithm,
        )

        # Store session in Redis with TTL matching JWT expiration
        session_key = f"vibepulse:session:{user.id}:{session_id}"
        session_data = {
            "user_id": str(user.id),
            "email": user.email,
            "created_at": now.isoformat(),
        }
        ttl_seconds = int(expires_delta.total_seconds())
        await self.redis.set(session_key, json.dumps(session_data), ex=ttl_seconds)

        return TokenResponse(
            access_token=token,
            token_type="bearer",  # noqa: S106
            user=UserResponse.model_validate(user),
        )

    async def validate_session(self, user_id: uuid.UUID, session_id: str) -> bool:
        """Checks if a user session is active in Redis."""
        session_key = f"vibepulse:session:{user_id}:{session_id}"
        exists = await self.redis.exists(session_key)
        return bool(exists)

    async def revoke_session(self, user_id: uuid.UUID, session_id: str) -> None:
        """Revokes an active session by removing it from Redis."""
        session_key = f"vibepulse:session:{user_id}:{session_id}"
        await self.redis.delete(session_key)

    # ── Email Verification Code ───────────────────────────────────────────────

    def generate_verification_code(self) -> str:
        """Generates a secure 6-digit numeric verification code."""
        return "".join(secrets.choice("0123456789") for _ in range(6))

    async def send_verification_code(self, email: str, code: str) -> None:
        """
        Sends the 6-digit verification code to the target email via SMTP
        if configured; always logs to stdout/structured logs for testing.
        """
        logger.info(
            "email_verification_code_generated",
            extra={"email": email, "verification_code": code},
        )

        if not self.settings.smtp_host or not self.settings.smtp_user:
            logger.info("smtp_not_configured_skipping_email", extra={"email": email})
            return

        def _send() -> None:
            msg = EmailMessage()
            msg["Subject"] = "Your VibePulse Verification Code"
            msg["From"] = self.settings.smtp_from_email
            msg["To"] = email
            msg.set_content(
                f"Welcome to VibePulse!\n\n"
                f"Your 6-digit email verification code is: {code}\n\n"
                f"This code will expire in "
                f"{self.settings.email_verification_code_expire_minutes} minutes.\n\n"
                f"If you did not request this, please ignore this email."
            )

            with smtplib.SMTP(
                self.settings.smtp_host,
                self.settings.smtp_port,
                timeout=10,
            ) as server:
                server.starttls()
                if self.settings.smtp_password:
                    server.login(self.settings.smtp_user, self.settings.smtp_password)
                server.send_message(msg)

        try:
            await asyncio.to_thread(_send)
            logger.info("verification_email_dispatched", extra={"email": email})
        except Exception as exc:
            logger.warning("verification_email_failed", extra={"email": email, "error": str(exc)})

    async def issue_verification_code(self, email: str) -> EmailVerification:
        """Persists a new 6-digit code and dispatches email notification."""
        code = self.generate_verification_code()
        expires_at = datetime.now(UTC) + timedelta(
            minutes=self.settings.email_verification_code_expire_minutes
        )

        verification = EmailVerification(
            email=email.lower().strip(),
            code=code,
            expires_at=expires_at,
            used=False,
        )
        self.db.add(verification)
        await self.db.flush()

        await self.send_verification_code(email, code)
        return verification

    # ── User Registration & Email Verification ────────────────────────────────

    async def register_user(self, payload: RegisterRequest) -> dict[str, str]:
        """
        Registers a new user account with hashed password and triggers email code.
        """
        email = payload.email.lower().strip()
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        existing_user = result.scalar_one_or_none()

        if existing_user is not None:
            if existing_user.is_verified:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="An account with this email address already exists.",
                )
            # Re-send verification code if user registered previously but not yet verified
            existing_user.hashed_password = self.hash_password(payload.password)
            if payload.full_name:
                existing_user.full_name = payload.full_name
            await self.issue_verification_code(email)
            await self.db.commit()
            return {"message": "Verification code sent to your email address."}

        hashed_password = self.hash_password(payload.password)
        new_user = User(
            email=email,
            hashed_password=hashed_password,
            full_name=payload.full_name,
            is_verified=False,
            provider="local",
        )
        self.db.add(new_user)
        await self.db.flush()

        await self.issue_verification_code(email)
        await self.db.commit()

        return {
            "message": "Registration successful. Please verify your email with the 6-digit code."
        }

    async def verify_email_code(self, email: str, code: str) -> TokenResponse:
        """
        Verifies the 6-digit code, activates the account, and returns an authenticated session.
        """
        normalized_email = email.lower().strip()
        cleaned_code = code.strip()

        stmt = (
            select(EmailVerification)
            .where(
                EmailVerification.email == normalized_email,
                EmailVerification.code == cleaned_code,
                EmailVerification.used.is_(False),
            )
            .order_by(desc(EmailVerification.created_at))
        )
        result = await self.db.execute(stmt)
        record = result.scalars().first()

        if record is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code.",
            )

        now = datetime.now(UTC)
        record_expiry = record.expires_at
        if record_expiry.tzinfo is None:
            record_expiry = record_expiry.replace(tzinfo=UTC)

        if record_expiry < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new one.",
            )

        # Mark code as used
        record.used = True

        # Activate user account
        user_stmt = select(User).where(User.email == normalized_email)
        user_result = await self.db.execute(user_stmt)
        user = user_result.scalar_one_or_none()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found.",
            )

        user.is_verified = True
        await self.db.commit()
        await self.db.refresh(user)

        return await self.create_user_session(user)

    async def resend_verification_code(self, email: str) -> dict[str, str]:
        """Resends a fresh verification code to an unverified user."""
        normalized_email = email.lower().strip()
        stmt = select(User).where(User.email == normalized_email)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found.",
            )

        if user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account is already verified. Please sign in.",
            )

        await self.issue_verification_code(normalized_email)
        await self.db.commit()
        return {"message": "A new verification code has been sent to your email."}

    # ── Local Password Login ──────────────────────────────────────────────────

    async def login_with_password(self, payload: LoginRequest) -> TokenResponse:
        """Authenticates user credentials and returns session token."""
        normalized_email = payload.email.lower().strip()
        stmt = select(User).where(User.email == normalized_email)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        if user is None or not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not self.verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not user.is_verified:
            # Re-issue code for convenience
            await self.issue_verification_code(normalized_email)
            await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not verified. A new 6-digit code has been sent to your email.",
            )

        return await self.create_user_session(user)

    # ── Google OAuth Login (GCP) ──────────────────────────────────────────────

    async def login_with_google(self, payload: GoogleLoginRequest) -> TokenResponse:
        """
        Validates Google ID Token with Google OAuth2 API, resolves/creates user,
        and establishes an active session.
        """
        google_token_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.credential}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.get(google_token_url)
            except Exception as exc:
                logger.error("google_auth_request_failed", extra={"error": str(exc)})
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to communicate with Google authentication services.",
                ) from exc

        if resp.status_code != status.HTTP_200_OK:
            logger.warning(
                "google_token_invalid",
                extra={"status": resp.status_code, "body": resp.text[:200]},
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google OAuth credential.",
            )

        token_info = resp.json()
        email = token_info.get("email")
        google_id = token_info.get("sub")
        email_verified_raw = token_info.get("email_verified")
        email_verified = email_verified_raw in (True, "true", "True")

        if not email or not google_id or not email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google account must have a verified email address.",
            )

        # Optional client ID check if configured
        if self.settings.google_client_id:
            aud = token_info.get("aud")
            if aud != self.settings.google_client_id:
                logger.warning(
                    "google_client_id_mismatch",
                    extra={"aud": aud, "expected": self.settings.google_client_id},
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Google client ID mismatch.",
                )

        normalized_email = email.lower().strip()
        full_name = token_info.get("name")
        avatar_url = token_info.get("picture")

        # Check existing user by google_id or email
        stmt = select(User).where((User.google_id == google_id) | (User.email == normalized_email))
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        if user is not None:
            # Link Google account if not linked
            if not user.google_id:
                user.google_id = google_id
            if not user.avatar_url and avatar_url:
                user.avatar_url = avatar_url
            if not user.full_name and full_name:
                user.full_name = full_name
            user.is_verified = True
        else:
            # Create verified Google user
            user = User(
                email=normalized_email,
                full_name=full_name,
                avatar_url=avatar_url,
                google_id=google_id,
                is_verified=True,
                provider="google",
            )
            self.db.add(user)

        await self.db.commit()
        await self.db.refresh(user)

        return await self.create_user_session(user)
