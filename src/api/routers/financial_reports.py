"""
===============================================================================
Router: financial_reports.py
Description: FastAPI Router kết nối Backend với cache-first financial report service.
             Cung cấp API cho Frontend truy xuất Báo cáo Tài chính, Coverage và
             Chỉ số Tài chính.
===============================================================================
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from src.api.services.cache_service import (
    get_financial_report_for_ticker,
    get_ingestion_summary,
)
from src.api.services.ratio_engine import compute_financial_ratios
from src.pipeline.fetch_financial_reports import FinancialReportFetcher

router = APIRouter(prefix="", tags=["Financial Reports"])


class IngestFinancialReportsRequest(BaseModel):
    tickers: Optional[List[str]] = None
    period: str = "quarter"
    source: str = "VCI"
    exclude_financial: bool = False


def _normalize_period(period_type: str) -> str:
    return "year" if period_type.upper() in ["YEARLY", "YEAR"] else "quarter"


@router.get("/financial-reports/summary")
def get_financial_reports_summary():
    """Dashboard summary cho báo cáo tài chính đã kéo về."""
    return get_ingestion_summary()


@router.get("/financial-reports/{ticker}")
def get_financial_reports(
    ticker: str,
    period_type: str = Query("QUARTERLY", description="Kỳ báo cáo: QUARTERLY hoặc YEARLY")
):
    """
    Trả về dữ liệu Báo cáo Tài chính (Balance Sheet, Income Statement, Cash Flow) cho mã cổ phiếu.
    """
    period = _normalize_period(period_type)
    data = get_financial_report_for_ticker(ticker, period=period)
    if data.get("error"):
        raise HTTPException(status_code=404, detail=data["error"])

    report = {
        "ticker": data["symbol"],
        "period_type": period_type,
        "period": data["period"],
        "balance_sheet": data.get("balance_sheet", []),
        "income_statement": data.get("income_statement", []),
        "cash_flow": data.get("cash_flow", []),
    }
    return {
        "data": report,
        "coverage": data.get("coverage", {}),
        "data_source": data.get("data_source"),
        "last_updated": data.get("last_updated"),
    }


@router.get("/financial-ratios/{ticker}")
def get_financial_ratios(ticker: str):
    """
    Trả về Bảng Chỉ số Tài chính (Financial Ratios) cho mã cổ phiếu.
    """
    period = "quarter"
    report = get_financial_report_for_ticker(ticker, period=period)
    if report.get("error"):
        raise HTTPException(status_code=404, detail=report["error"])

    ratios = compute_financial_ratios(
        report.get("balance_sheet", []),
        report.get("income_statement", []),
        report.get("cash_flow", []),
    )
    payload = {
        "ticker": report["symbol"],
        "period": period,
        "data": ratios.get("periods", []),
        "ratios": ratios.get("periods", []),
        "technical": ratios.get("technical", {}),
        "total_periods": ratios.get("total_periods", 0),
        "coverage": report.get("coverage", {}),
        "data_source": report.get("data_source"),
        "last_updated": report.get("last_updated"),
    }
    if ratios.get("error"):
        payload["error"] = ratios["error"]
    return payload


@router.post("/financial-reports/ingest")
def ingest_financial_reports(request: IngestFinancialReportsRequest):
    """
    Kích hoạt Pipeline thu thập Báo cáo tài chính cho danh sách cổ phiếu.
    """
    try:
        fetcher = FinancialReportFetcher(
            source=request.source,
            period=request.period,
            output_dir="data/raw/financial_reports"
        )
        data = fetcher.fetch_all(
            symbols=request.tickers,
            exclude_financial=request.exclude_financial,
            delay_seconds=1.5
        )
        saved_files = fetcher.save_data(data, file_format="both")
        return {"status": "success", "saved_files": saved_files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi thực thi Pipeline: {e}")
