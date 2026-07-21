from fastapi import APIRouter, Depends, HTTPException, Query
from src.api.schemas.api_models import CompanyListResponse
from src.api.dependencies import get_data_service
from src.api.services.data_service import DataService

router = APIRouter(prefix="/companies", tags=["Companies"])

@router.get("/", response_model=CompanyListResponse)
def get_companies(
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    limit: int = Query(50, le=100, description="Số lượng kết quả mỗi trang"),
    data_service: DataService = Depends(get_data_service)
):
    """
    API Lấy danh sách các mã cổ phiếu (tickers) hiện có (Task K09).
    Router này (Controller layer) chỉ nhận Request, sau đó ủy quyền cho DataService xử lý.
    """
    try:
        return data_service.get_companies(page, limit)
    except Exception as e:
        # Trong thực tế, có thể ghi log lỗi ở đây
        raise HTTPException(status_code=500, detail=f"Lỗi Server: {str(e)}")
