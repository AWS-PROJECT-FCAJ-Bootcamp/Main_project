from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr = Field(..., description="Email đăng ký của người dùng")
    password: str = Field(..., min_length=6, description="Mật khẩu (tối thiểu 6 ký tự)")
    full_name: str = Field(..., min_length=2, description="Họ và tên người dùng")


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Email người dùng")
    password: str = Field(..., description="Mật khẩu")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: str


class UserProfileResponse(BaseModel):
    user_id: str
    email: str
    full_name: str
    created_at: str
    role: str = "user"

    model_config = ConfigDict(from_attributes=True)


class WatchlistCreateRequest(BaseModel):
    ticker: str = Field(..., min_length=2, max_length=10, description="Mã chứng khoán (ví dụ: FPT, VNM)")
    note: str = Field("", description="Ghi chú cá nhân cho mã cổ phiếu này")


class WatchlistItemResponse(BaseModel):
    user_id: str
    ticker: str
    added_at: str
    note: str = ""

    model_config = ConfigDict(from_attributes=True)


class WatchlistListResponse(BaseModel):
    total_records: int
    data: list[WatchlistItemResponse]
