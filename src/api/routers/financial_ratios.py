from __future__ import annotations

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException

from src.api.dependencies import get_current_user, get_data_service
from src.api.services.data_service import DataService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/financial-ratios", tags=["Financial Ratios"])

from pydantic import BaseModel

class CalculateRequest(BaseModel):
    tickers: List[str]

@router.get("/{ticker}")
def get_financial_ratios(
    ticker: str,
    data_service: DataService = Depends(get_data_service),
    _current_user: dict = Depends(get_current_user),
):
    """
    Lấy dữ liệu Chỉ số tài chính & kỹ thuật cho mã cổ phiếu.
    Kiểm tra và truy vấn trực tiếp dữ liệu thực từ Data Lake/Database.
    """
    clean_ticker = ticker.strip().upper()
    
    data = data_service.get_financial_ratios(clean_ticker)
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy dữ liệu cho mã chứng khoán {clean_ticker} trong hệ thống."
        )
    return {
        "ticker": clean_ticker,
        "data": data
    }

@router.post("/calculate")
def calculate_financial_ratios(
    request: CalculateRequest,
    data_service: DataService = Depends(get_data_service),
    _current_user: dict = Depends(get_current_user),
):
    """
    Kích hoạt tiến trình tính toán chỉ số tài chính cho các mã chứng khoán yêu cầu.
    """
    return data_service.calculate_ratios(request.tickers)
