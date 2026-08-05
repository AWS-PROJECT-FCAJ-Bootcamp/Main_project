"""Auth router: register, login, logout, token refresh, and /me endpoint.

Simplified flow:
  - Register: full_name + password → user created with role=guest, active immediately
  - Login: full_name + password → JWT access token + refresh token cookie
  - No email, no pending/approval workflow
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.database import get_db
from src.api.dependencies import get_current_user
from src.api.models import RefreshToken, User, UserRole
from src.api.services.auth_service import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
    refresh_token_expires_at,
    verify_password,
)
from src.settings import settings

router = APIRouter(prefix="/auth", tags=["Auth"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255, description="Tên đăng nhập (duy nhất)")
    password: str = Field(min_length=8, description="Mật khẩu (tối thiểu 8 ký tự)")


class LoginRequest(BaseModel):
    full_name: str = Field(min_length=1)
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class UserOut(BaseModel):
    id: uuid.UUID
    full_name: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """Register a new account.

    The new account is created with:
    - role = guest
    - immediately active (can log in right away)
    """
    # Check duplicate full_name
    existing = await db.execute(select(User).where(User.full_name == body.full_name))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.",
        )

    user = User(
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role=UserRole.guest,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {
        "message": "Đăng ký thành công! Bạn có thể đăng nhập ngay.",
        "user_id": str(user.id),
        "role": user.role.value,
    }


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate with full_name + password and receive an access token + refresh token cookie."""
    result = await db.execute(select(User).where(User.full_name == body.full_name))
    user: User | None = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác.",
        )

    # Issue access token
    access_token = create_access_token(
        user_id=str(user.id),
        full_name=user.full_name,
        role=user.role.value,
    )

    # Issue refresh token → store hash in DB
    raw_refresh, hashed_refresh = create_refresh_token()
    rt = RefreshToken(
        user_id=user.id,
        token_hash=hashed_refresh,
        expires_at=refresh_token_expires_at(),
    )
    db.add(rt)
    await db.commit()

    # Set refresh token in HttpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh,
        httponly=True,
        secure=settings.environment != "local",
        samesite="lax",
        max_age=settings.jwt_refresh_token_expire_days * 86400,
        path="/auth/refresh",
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role.value,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Exchange a valid refresh token cookie for a new access token."""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found.",
        )

    token_hash = hash_refresh_token(refresh_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
        )
    )
    rt: RefreshToken | None = result.scalar_one_or_none()

    if not rt or rt.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

    user_result = await db.execute(select(User).where(User.id == rt.user_id))
    user: User = user_result.scalar_one()

    # Rotate: revoke old, issue new
    rt.revoked = True
    raw_new, hashed_new = create_refresh_token()
    new_rt = RefreshToken(
        user_id=user.id,
        token_hash=hashed_new,
        expires_at=refresh_token_expires_at(),
    )
    db.add(new_rt)
    await db.commit()

    access_token = create_access_token(
        user_id=str(user.id),
        full_name=user.full_name,
        role=user.role.value,
    )

    response.set_cookie(
        key="refresh_token",
        value=raw_new,
        httponly=True,
        secure=settings.environment != "local",
        samesite="lax",
        max_age=settings.jwt_refresh_token_expire_days * 86400,
        path="/auth/refresh",
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role.value,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Revoke the refresh token and clear the cookie."""
    if refresh_token:
        token_hash = hash_refresh_token(refresh_token)
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        rt = result.scalar_one_or_none()
        if rt:
            rt.revoked = True
            await db.commit()

    response.delete_cookie(key="refresh_token", path="/auth/refresh")


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)) -> UserOut:
    """Return the currently authenticated user's profile."""
    return UserOut.model_validate(user)
