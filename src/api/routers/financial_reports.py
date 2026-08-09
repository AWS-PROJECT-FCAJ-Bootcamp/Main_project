from __future__ import annotations

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from src.api.dependencies import get_current_user, get_data_service
from src.api.services.data_service import DataService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/financial-reports", tags=["Financial Reports"])

class IngestRequest(BaseModel):
    tickers: List[str]
    start_year: int
    end_year: int
    report_types: List[str]

@router.get("/{ticker}")
def get_financial_report(
    ticker: str,
    period_type: str = Query("YEARLY", description="YEARLY hoặc QUARTERLY"),
    data_service: DataService = Depends(get_data_service),
    _current_user: dict = Depends(get_current_user),
):
    """
    Lấy dữ liệu Báo cáo Tài chính cho mã cổ phiếu.
    Kiểm tra và truy vấn trực tiếp dữ liệu thực từ Data Lake/Database.
    """
    clean_ticker = ticker.strip().upper()
    
    report = data_service.get_financial_report(clean_ticker, period_type)
    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy dữ liệu cho mã chứng khoán {clean_ticker} trong hệ thống."
        )
    return report

@router.post("/ingest")
def ingest_financial_reports(
    request: IngestRequest,
    data_service: DataService = Depends(get_data_service),
    _current_user: dict = Depends(get_current_user),
):
    """
    Kích hoạt tiến trình nạp dữ liệu báo cáo tài chính cho các mã chứng khoán yêu cầu.
    """
    return data_service.ingest_reports(
        tickers=request.tickers,
        start_year=request.start_year,
        end_year=request.end_year,
        report_types=request.report_types
    )
