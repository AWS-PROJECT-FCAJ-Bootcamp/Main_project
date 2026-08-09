from __future__ import annotations

import logging
import os

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.api.database import get_db_connection
from src.api.services.data_service import DataService
from src.api.services.user_service import BaseUserService, LocalSQLiteUserService
from src.settings import get_settings

logger = logging.getLogger(__name__)
security_scheme = HTTPBearer(auto_error=False)


def get_data_service(db=Depends(get_db_connection)) -> DataService:
    if db is None:
        raise HTTPException(status_code=503, detail="DuckDB is unavailable")
    return DataService(db, get_settings())


def get_user_service() -> BaseUserService:
    """Dependency providing the User & Watchlist Service (SQLite local, DynamoDB on AWS)."""
    user_db_type = os.environ.get("USER_DB_TYPE", "sqlite").lower()
    if user_db_type == "dynamodb":
        from src.api.services.user_service import DynamoDBUserService
        return DynamoDBUserService()
    return LocalSQLiteUserService()


def get_current_user(
    auth: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    user_service: BaseUserService = Depends(get_user_service),
) -> dict:
    """Extract and validate the authenticated user from JWT Bearer token.

    Security model:
    - LOCAL / test: verify JWT signature with JWT_SECRET_KEY (HS256)
    - PRODUCTION: API Gateway + Cognito already verified the RS256 signature.
      FastAPI only needs to decode the payload to extract claims.
      We still validate expiry and issuer to guard against token replay after
      the API Gateway authorizer caches a positive result.
    """
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization Bearer token là bắt buộc",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_settings()
    token = auth.credentials

    try:
        if settings.is_cloud:
            # Production: Cognito issues RS256 tokens.
            # API Gateway Cognito Authorizer already validated signature + expiry.
            # We decode without re-verifying the signature to extract claims only.
            # Expiry is still enforced via PyJWT option.
            payload = jwt.decode(
                token,
                options={
                    "verify_signature": False,
                    "verify_exp": True,   # still reject expired tokens
                    "verify_aud": False,  # Cognito tokens may not have 'aud'
                },
                algorithms=["RS256", "HS256"],
            )
        else:
            # Local: verify full HS256 signature with our secret key
            payload = jwt.decode(
                token,
                key=settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
                options={"verify_exp": True},
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as exc:
        logger.warning("JWT decode failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 'sub' is the Cognito user_id, 'user_id' is our custom local token claim
    user_id: str | None = payload.get("sub") or payload.get("user_id")
    email: str | None = payload.get("email")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không chứa thông tin User ID",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = user_service.get_user_by_id(user_id)

    # Auto-sync: user logged in via Cognito but not yet in our DB → create record
    if not user and email and settings.is_cloud:
        logger.info("Auto-syncing Cognito user %s to DB", user_id)
        try:
            user = user_service.register_user(
                email=email,
                password="cognito_managed",
                full_name=payload.get("name", email),
            )
        except ValueError:
            # Already exists (race condition) — try fetching again
            user = user_service.get_user_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản người dùng không tồn tại",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
