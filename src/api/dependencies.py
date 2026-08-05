"""FastAPI dependency providers.

- get_data_service: DuckDB analytics (Parquet reads) — existing
- get_db: async PostgreSQL session — new
- get_current_user: JWT bearer token → User row — new
- require_admin: restrict endpoint to admin role — new
"""
from __future__ import annotations

import uuid

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.database import get_db, get_db_connection
from src.api.models import User, UserRole
from src.api.services.auth_service import decode_access_token
from src.api.services.data_service import DataService
from src.settings import get_settings

# ─── DuckDB (analytics / Parquet) ─────────────────────────────────────────────

def get_data_service(db=Depends(get_db_connection)) -> DataService:
    if db is None:
        raise HTTPException(status_code=503, detail="DuckDB is unavailable")
    return DataService(db, get_settings())


# ─── JWT Bearer ───────────────────────────────────────────────────────────────

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validate JWT and return the corresponding User row.

    Accepts token from:
        1. Authorization: Bearer <token>  header
        2. access_token cookie (fallback for browser clients)
    """
    token: str | None = None

    if credentials:
        token = credentials.credentials
    else:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(token)
        user_id_str: str = payload.get("sub", "")
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


async def require_active(user: User = Depends(get_current_user)) -> User:
    """Alias for get_current_user — all registered users are active.

    Kept for backward compatibility with routes that use require_active.
    """
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Restrict endpoint to admin role only."""
    if user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required.",
        )
    return user
