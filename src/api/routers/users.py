from fastapi import APIRouter, Depends, HTTPException, Path, status

from src.api.dependencies import get_current_user, get_user_service
from src.api.schemas.auth_schemas import (
    UserProfileResponse,
    WatchlistCreateRequest,
    WatchlistItemResponse,
    WatchlistListResponse,
)
from src.api.services.user_service import BaseUserService

router = APIRouter(prefix="/users", tags=["User Profile & Watchlist Management"])


@router.get(
    "/me",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy thông tin cá nhân của người dùng hiện tại",
)
def get_user_me(current_user: dict = Depends(get_current_user)):
    """Trả về thông tin hồ sơ của người dùng đang đăng nhập."""
    return current_user


@router.get(
    "/watchlist",
    response_model=WatchlistListResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy danh sách cổ phiếu theo dõi của người dùng",
)
def get_watchlist(
    current_user: dict = Depends(get_current_user),
    user_service: BaseUserService = Depends(get_user_service),
):
    """Lấy danh sách mã chứng khoán trong Watchlist cá nhân."""
    items = user_service.get_watchlist(current_user["user_id"])
    return {
        "total_records": len(items),
        "data": items,
    }


@router.post(
    "/watchlist",
    response_model=WatchlistItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Thêm mã cổ phiếu vào danh sách theo dõi",
)
def add_to_watchlist(
    request: WatchlistCreateRequest,
    current_user: dict = Depends(get_current_user),
    user_service: BaseUserService = Depends(get_user_service),
):
    """Thêm hoặc cập nhật ghi chú mã cổ phiếu vào Watchlist."""
    item = user_service.add_to_watchlist(
        user_id=current_user["user_id"],
        ticker=request.ticker,
        note=request.note,
    )
    return item


@router.delete(
    "/watchlist/{ticker}",
    status_code=status.HTTP_200_OK,
    summary="Xóa mã cổ phiếu khỏi danh sách theo dõi",
)
def remove_from_watchlist(
    ticker: str = Path(..., min_length=2, max_length=10, description="Mã chứng khoán cần xóa"),
    current_user: dict = Depends(get_current_user),
    user_service: BaseUserService = Depends(get_user_service),
):
    """Xóa một mã chứng khoán khỏi Watchlist cá nhân."""
    success = user_service.remove_from_watchlist(
        user_id=current_user["user_id"],
        ticker=ticker,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mã chứng khoán '{ticker.upper()}' không có trong danh sách theo dõi",
        )
    return {
        "status": "success",
        "message": f"Đã xóa mã {ticker.upper()} khỏi danh sách theo dõi",
    }
