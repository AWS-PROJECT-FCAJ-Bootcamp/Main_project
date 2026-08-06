from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.api.database import get_db_connection
from src.api.services.auth_service import decode_access_token
from src.api.services.data_service import DataService
from src.api.services.user_service import BaseUserService, LocalSQLiteUserService
from src.settings import get_settings

security_scheme = HTTPBearer(auto_error=False)


def get_data_service(db=Depends(get_db_connection)) -> DataService:
    if db is None:
        raise HTTPException(status_code=503, detail="DuckDB is unavailable")
    return DataService(db, get_settings())


def get_user_service() -> BaseUserService:
    """Dependency providing the User & Watchlist Service instance."""
    return LocalSQLiteUserService()


def get_current_user(
    auth: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    user_service: BaseUserService = Depends(get_user_service),
) -> dict:
    """Dependency extracting and validating the authenticated user from JWT Bearer token."""
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Header Authorization Bearer token là bắt buộc",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(auth.credentials)
    if not payload or "user_id" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = user_service.get_user_by_id(payload["user_id"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản người dùng không tồn tại",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
