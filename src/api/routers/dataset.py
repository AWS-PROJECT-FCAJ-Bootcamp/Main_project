"""Dataset export router — /dataset/preview & /dataset/export."""
from __future__ import annotations

import io
import logging
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from src.api.dependencies import require_active
from src.api.models import User
from src.api.services.cache_service import (
    _find_latest_parquet,
    _load_parquet,
    _ticker_col,
    get_ingestion_summary,
)
from src.api.services.ratio_engine import compute_distress_score, compute_financial_ratios

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dataset", tags=["Dataset"])

FINANCIAL_RAW_DIR = Path("data/raw/financial_reports")
RATIOS_DIR = Path("data/processed/ratios")


def _load_ratios_parquet() -> pd.DataFrame | None:
    """Load pre-computed ratios if available."""
    for p in [
        RATIOS_DIR / "financial_ratios.parquet",
        FINANCIAL_RAW_DIR / "financial_ratios.parquet",
    ]:
        if p.exists():
            return pd.read_parquet(p)
    return None


def _build_dataset_row(symbol: str, period_data: dict) -> dict:
    """Build a single dataset row from pre-computed ratio data."""
    missing_reasons: list[str] = []

    r = period_data.copy()
    r["ticker"] = symbol

    # Check missing fields and add reasons
    if r.get("roa") is None:
        missing_reasons.append("Thiếu ROA: chưa có đủ dữ liệu Báo cáo Kết quả Kinh doanh")
    if r.get("z_score") is None:
        missing_reasons.append("Z-Score không tính được: thiếu thành phần Working Capital, EBIT hoặc Revenue")
    if r.get("distress_label") is None:
        missing_reasons.append("Chưa gán nhãn distress — cần chạy Distress Engine")

    if missing_reasons:
        r["missing_reason"] = " | ".join(missing_reasons)
    else:
        r["missing_reason"] = None

    return r


@router.get("/preview")
async def preview_dataset(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=10, le=200),
    _user: User = Depends(require_active),
) -> dict:
    """Return paginated dataset rows for the DatasetExportView."""

    # Try to load pre-computed ratios first
    ratios_df = _load_ratios_parquet()

    if ratios_df is not None and not ratios_df.empty:
        # Pre-computed — return directly
        ratios_df = ratios_df.astype(object).where(pd.notna(ratios_df), None)
        all_rows = ratios_df.to_dict(orient="records")
        # Add missing_reason field if not present
        for row in all_rows:
            if "missing_reason" not in row:
                row["missing_reason"] = None
    else:
        # Build on the fly from financial reports storage
        all_rows = _build_from_storage()

    if not all_rows:
        return {
            "rows": [],
            "summary": {
                "total_rows": 0,
                "total_companies": 0,
                "missing_rows": 0,
                "message": "Chưa có dataset. Hãy chạy pipeline thu thập dữ liệu trước.",
            },
            "page": page,
            "total_pages": 0,
        }

    total = len(all_rows)
    label_1 = sum(1 for r in all_rows if r.get("distress_label") == 1)
    label_0 = sum(1 for r in all_rows if r.get("distress_label") == 0)
    missing = sum(1 for r in all_rows if r.get("missing_reason"))

    # Pagination
    offset = (page - 1) * page_size
    page_rows = all_rows[offset: offset + page_size]
    total_pages = max(1, (total + page_size - 1) // page_size)

    # Collect missing reasons summary
    from collections import Counter
    reason_counter: Counter = Counter()
    for r in all_rows:
        if r.get("missing_reason"):
            for reason in r["missing_reason"].split(" | "):
                reason_counter[reason.split(":")[0].strip()] += 1

    return {
        "rows": page_rows,
        "summary": {
            "total_rows": total,
            "total_companies": len({r.get("ticker") for r in all_rows}),
            "label_0_count": label_0,
            "label_1_count": label_1,
            "distress_ratio_pct": round(label_1 / total * 100, 2) if total else 0,
            "missing_rows": missing,
            "missing_reasons": dict(reason_counter.most_common(10)),
        },
        "page": page,
        "total_pages": total_pages,
    }


def _build_from_storage() -> list[dict]:
    """Build dataset on-the-fly from financial reports in storage."""
    rows: list[dict] = []

    bs_path = _find_latest_parquet("balance_sheet", "quarter")
    is_path = _find_latest_parquet("income_statement", "quarter")
    cf_path = _find_latest_parquet("cash_flow", "quarter")

    if bs_path is None:
        return []

    try:
        bs_df = _load_parquet(bs_path)
        ticker_col = _ticker_col(bs_df)
        if ticker_col is None:
            return []

        symbols = bs_df[ticker_col].str.upper().unique()
        is_df = _load_parquet(is_path) if is_path else pd.DataFrame()
        cf_df = _load_parquet(cf_path) if cf_path else pd.DataFrame()

        for symbol in symbols[:200]:  # limit for performance
            try:
                bs_rows = bs_df[bs_df[ticker_col].str.upper() == symbol].to_dict(orient="records")
                is_rows = is_df[is_df[_ticker_col(is_df) or "ticker"].str.upper() == symbol].to_dict(orient="records") if not is_df.empty else []
                cf_rows = cf_df[cf_df[_ticker_col(cf_df) or "ticker"].str.upper() == symbol].to_dict(orient="records") if not cf_df.empty else []

                result = compute_financial_ratios(bs_rows, is_rows, cf_rows)
                dist = compute_distress_score(bs_rows, is_rows, cf_rows)

                for period_data in result.get("periods", []):
                    row = {
                        "ticker": symbol,
                        "period": period_data.get("period"),
                        "roa": period_data.get("roa"),
                        "roe": period_data.get("roe"),
                        "current_ratio": period_data.get("current_ratio"),
                        "debt_to_ta": period_data.get("debt_ratio"),
                        "ebit_margin": period_data.get("ebit_margin"),
                        "log_total_assets": period_data.get("log_total_assets"),
                        "z_score": period_data.get("z_score"),
                        "z_score_zone": period_data.get("z_score_zone"),
                        "distress_label": dist.get("distress_label") if dist.get("period") == period_data.get("period") else None,
                        "distress_score": dist.get("distress_score") if dist.get("period") == period_data.get("period") else None,
                        "distress_status": dist.get("distress_status") if dist.get("period") == period_data.get("period") else None,
                        "missing_reason": None,
                    }

                    # Flag missing fields
                    missing = []
                    if row["roa"] is None:
                        missing.append("Thiếu ROA: chưa có Báo cáo KQKD đầy đủ")
                    if row["z_score"] is None:
                        missing.append("Z-Score không tính được")
                    if row["distress_label"] is None:
                        missing.append("Chưa gán nhãn distress")
                    row["missing_reason"] = " | ".join(missing) if missing else None

                    rows.append(row)
            except Exception as e:
                logger.warning("Error building row for %s: %s", symbol, e)
                rows.append({
                    "ticker": symbol,
                    "period": None,
                    "missing_reason": f"Lỗi tính toán: {str(e)[:100]}",
                })

    except Exception as e:
        logger.exception("Error building dataset from storage: %s", e)

    return rows


@router.get("/export")
async def export_dataset(
    format: str = Query("CSV", description="CSV | PARQUET"),
    _user: User = Depends(require_active),
) -> StreamingResponse:
    """Export full dataset as CSV or Parquet file download."""
    rows = _build_from_storage()

    if not rows:
        raise HTTPException(status_code=404, detail="Chưa có dataset để xuất")

    df = pd.DataFrame(rows)

    if format.upper() == "PARQUET":
        buf = io.BytesIO()
        df.to_parquet(buf, index=False)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/octet-stream",
            headers={"Content-Disposition": "attachment; filename=financial_distress_dataset.parquet"},
        )
    else:
        buf = io.StringIO()
        df.to_csv(buf, index=False, encoding="utf-8-sig")
        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv; charset=utf-8-sig",
            headers={"Content-Disposition": "attachment; filename=financial_distress_dataset.csv"},
        )
