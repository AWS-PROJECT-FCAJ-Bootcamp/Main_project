"""Auth service: JWT token management + bcrypt password hashing.

Local: tokens issued by FastAPI itself.
Cloud: will be replaced by Amazon Cognito JWT verification.
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from src.settings import settings

# ─── Password hashing ─────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Return bcrypt hash of the plain-text password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


# ─── JWT tokens ───────────────────────────────────────────────────────────────
_SECRET = settings.jwt_secret_key.get_secret_value()
_ALGORITHM = settings.jwt_algorithm


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(
    *,
    user_id: str,
    full_name: str,
    role: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token."""
    expire = _utcnow() + (
        expires_delta
        or timedelta(minutes=settings.jwt_access_token_expire_minutes)
    )
    payload = {
        "sub": user_id,
        "full_name": full_name,
        "role": role,
        "exp": expire,
        "iat": _utcnow(),
        "type": "access",
    }
    return jwt.encode(payload, _SECRET, algorithm=_ALGORITHM)


def create_refresh_token() -> tuple[str, str]:
    """Return a (raw_token, hashed_token) pair.

    Store the hash in DB; send raw_token to the client in HttpOnly cookie.
    """
    raw = secrets.token_urlsafe(64)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def hash_refresh_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token. Raises JWTError on failure."""
    try:
        payload = jwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
        if payload.get("type") != "access":
            raise JWTError("Token type mismatch")
        return payload
    except JWTError:
        raise


def refresh_token_expires_at() -> datetime:
    return _utcnow() + timedelta(days=settings.jwt_refresh_token_expire_days)
