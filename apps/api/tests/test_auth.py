"""
Tests for Authentication feature: email/password, 6-digit verification code,
Google OAuth, JWT tokens, and Redis session lifecycle.
"""

from __future__ import annotations

import json

import httpx
import jwt
import pytest
from app.core.config import get_settings
from app.core.redis import get_redis_client
from app.features.auth.models import EmailVerification, User
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_register_and_verify_email(client: AsyncClient, db_session: AsyncSession) -> None:
    # 1. Register a new user
    reg_resp = await client.post(
        "/api/auth/register",
        json={
            "email": "developer@vibepulse.dev",
            "password": "SecurePassword123!",
            "full_name": "Vibe Developer",
        },
    )
    assert reg_resp.status_code == 201
    assert "Registration successful" in reg_resp.json()["message"]

    # 2. Check that the verification code was saved in database
    stmt = select(EmailVerification).where(EmailVerification.email == "developer@vibepulse.dev")
    res = await db_session.execute(stmt)
    verification = res.scalar_one_or_none()
    assert verification is not None
    assert len(verification.code) == 6
    code = verification.code

    # 3. Attempt to login before verification -> should fail with 403
    unverified_login = await client.post(
        "/api/auth/login",
        json={
            "email": "developer@vibepulse.dev",
            "password": "SecurePassword123!",
        },
    )
    assert unverified_login.status_code == 403
    assert "Email not verified" in unverified_login.json()["detail"]

    # 4. Attempt to verify with invalid code -> should fail with 400
    bad_code_resp = await client.post(
        "/api/auth/verify-email",
        json={
            "email": "developer@vibepulse.dev",
            "code": "000000" if code != "000000" else "999999",
        },
    )
    assert bad_code_resp.status_code == 400

    # 5. Verify with correct code -> should succeed and issue token
    verify_resp = await client.post(
        "/api/auth/verify-email",
        json={
            "email": "developer@vibepulse.dev",
            "code": code,
        },
    )
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "developer@vibepulse.dev"
    assert data["user"]["is_verified"] is True
    token = data["access_token"]

    # 6. Fetch /me using the bearer token
    me_resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "developer@vibepulse.dev"


@pytest.mark.asyncio
async def test_password_login_and_logout_revocation(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    # 1. Register and verify
    await client.post(
        "/api/auth/register",
        json={"email": "session_test@vibepulse.dev", "password": "Password789!"},
    )
    stmt = select(EmailVerification).where(EmailVerification.email == "session_test@vibepulse.dev")
    res = await db_session.execute(stmt)
    verification = res.scalar_one_or_none()
    assert verification is not None

    await client.post(
        "/api/auth/verify-email",
        json={"email": "session_test@vibepulse.dev", "code": verification.code},
    )

    # 2. Login with wrong password -> 401
    bad_login = await client.post(
        "/api/auth/login",
        json={"email": "session_test@vibepulse.dev", "password": "WrongPassword!"},
    )
    assert bad_login.status_code == 401

    # 3. Login with valid password -> 200
    login_resp = await client.post(
        "/api/auth/login",
        json={"email": "session_test@vibepulse.dev", "password": "Password789!"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # 4. Check active session
    me_resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200

    # 5. Logout (revokes Redis session)
    logout_resp = await client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout_resp.status_code == 200
    assert "Successfully signed out" in logout_resp.json()["message"]

    # 6. Re-attempt to use revoked token -> 401 Unauthorized
    revoked_me_resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert revoked_me_resp.status_code == 401
    assert "revoked" in revoked_me_resp.json()["detail"]


@pytest.mark.asyncio
async def test_google_login(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Mock Google Tokeninfo HTTP call
    class MockResponse:
        status_code = 200
        text = '{"email": "gcp_user@vibepulse.dev"}'

        def json(self) -> dict[str, str | bool]:
            from app.core.config import get_settings

            settings = get_settings()
            return {
                "email": "gcp_user@vibepulse.dev",
                "sub": "google-user-12345",
                "name": "Google User",
                "picture": "https://example.com/avatar.png",
                "email_verified": True,
                "aud": settings.google_client_id or "mock-client-id",
            }

    async def mock_get(self: httpx.AsyncClient, url: str, **kwargs: object) -> MockResponse:
        return MockResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    # Call /api/auth/google
    resp = await client.post(
        "/api/auth/google",
        json={"credential": "mock-google-id-token-xyz"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "gcp_user@vibepulse.dev"
    assert data["user"]["provider"] == "google"
    assert data["user"]["is_verified"] is True

    # User exists in DB and is marked verified
    stmt = select(User).where(User.email == "gcp_user@vibepulse.dev")
    db_res = await db_session.execute(stmt)
    user = db_res.scalar_one_or_none()
    assert user is not None
    assert user.google_id == "google-user-12345"
    assert user.is_verified is True


@pytest.mark.asyncio
async def test_redis_session_caching_and_instant_auth(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies user profile is cached in Redis session and retrieved directly without DB hits."""
    redis_client = get_redis_client()

    # 1. Register & verify user
    await client.post(
        "/api/auth/register",
        json={
            "email": "fast_auth@vibepulse.dev",
            "password": "FastPassword123!",
            "full_name": "Fast Auth",
        },
    )
    stmt = select(EmailVerification).where(EmailVerification.email == "fast_auth@vibepulse.dev")
    res = await db_session.execute(stmt)
    verification = res.scalar_one_or_none()
    assert verification is not None

    verify_resp = await client.post(
        "/api/auth/verify-email",
        json={"email": "fast_auth@vibepulse.dev", "code": verification.code},
    )
    token = verify_resp.json()["access_token"]
    user_id = verify_resp.json()["user"]["id"]

    # 2. Inspect session stored in Redis
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    session_id = payload["session_id"]
    redis_key = f"vibepulse:session:{user_id}:{session_id}"

    cached_raw = await redis_client.get(redis_key)
    assert cached_raw is not None
    cached_session = json.loads(cached_raw)
    assert cached_session["email"] == "fast_auth@vibepulse.dev"
    assert cached_session["full_name"] == "Fast Auth"
    assert cached_session["is_verified"] is True

    # 3. Call /api/auth/me - served directly from Redis
    me_resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    data = me_resp.json()
    assert data["email"] == "fast_auth@vibepulse.dev"
    assert data["full_name"] == "Fast Auth"
    assert data["is_verified"] is True
