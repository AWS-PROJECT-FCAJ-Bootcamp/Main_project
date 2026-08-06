from fastapi import APIRouter, Depends, HTTPException, status

from src.api.dependencies import get_current_user, get_user_service
from src.api.schemas.auth_schemas import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserProfileResponse,
)
from src.api.services.auth_service import create_access_token
from src.api.services.user_service import BaseUserService

router = APIRouter(prefix="/auth", tags=["Authentication & Profile"])


@router.post(
    "/register",
    response_model=UserProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký tài khoản người dùng mới",
)
def register(
    request: RegisterRequest,
    user_service: BaseUserService = Depends(get_user_service),
):
    """
    Đăng ký tài khoản mới:
    - Mã hóa mật khẩu bằng Bcrypt
    - Khởi tạo profile lưu trong cơ sở dữ liệu
    """
    try:
        user = user_service.register_user(
            email=request.email,
            password=request.password,
            full_name=request.full_name,
        )
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi đăng ký: {str(e)}",
        )


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Đăng nhập và nhận JWT Access Token",
)
def login(
    request: LoginRequest,
    user_service: BaseUserService = Depends(get_user_service),
):
    """
    Đăng nhập hệ thống:
    - Kiểm tra email & password
    - Trả về mã JWT Bearer Token có thời hạn 24 giờ
    """
    user = user_service.authenticate_user(email=request.email, password=request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token({"user_id": user["user_id"], "email": user["email"]})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user["user_id"],
        "email": user["email"],
        "full_name": user["full_name"],
    }


@router.get(
    "/me",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy thông tin tài khoản hiện tại",
)
def get_profile(current_user: dict = Depends(get_current_user)):
    """Trả về thông tin chi tiết của người dùng đang đăng nhập."""
    return current_user
