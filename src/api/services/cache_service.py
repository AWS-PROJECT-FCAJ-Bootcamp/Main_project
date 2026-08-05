"""Cache-first service cho Financial Reports.

Logic:
  1. Kiểm tra Parquet storage local (data/raw/financial_reports/)
  2. Nếu có → trả về ngay (với metadata nguồn cache)
  3. Nếu thiếu → crawl từ vnstock → lưu Parquet → trả về

Coverage note được trả kèm để frontend hiển thị lý do thiếu dữ liệu.
"""
from __future__ import annotations

import glob
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import pandas as pd

from src.settings import settings

logger = logging.getLogger(__name__)

# Base dir for financial report raw data
FINANCIAL_RAW_DIR = Path("data/raw/financial_reports")
REPORT_TYPE_MAP = {
    "balance_sheet": "bs",
    "income_statement": "is",
    "cash_flow": "cf",
}


def _find_latest_parquet(report_type: str, period: str = "quarter") -> Optional[Path]:
    """Tìm file Parquet mới nhất theo pattern."""
    pattern = str(FINANCIAL_RAW_DIR / f"{report_type}_{period}_*.parquet")
    files = glob.glob(pattern)
    if files:
        return Path(sorted(files, reverse=True)[0])

    # Fallback to checkpoint
    short = REPORT_TYPE_MAP.get(report_type, report_type[:2])
    ckpt = FINANCIAL_RAW_DIR / "checkpoints" / f"{short}_checkpoint.parquet"
    if ckpt.exists():
        return ckpt

    # Fallback to CSV
    csv_pattern = str(FINANCIAL_RAW_DIR / f"{report_type}_{period}_*.csv")
    csv_files = glob.glob(csv_pattern)
    if csv_files:
        return Path(sorted(csv_files, reverse=True)[0])

    return None


def _load_parquet(path: Path) -> pd.DataFrame:
    if path.suffix == ".parquet":
        return pd.read_parquet(path)
    return pd.read_csv(path)


def _ticker_col(df: pd.DataFrame) -> Optional[str]:
    for col in ("ticker", "symbol"):
        if col in df.columns:
            return col
    return None


def _coverage_note(symbol: str, period: str, report_type: str, reason: str) -> dict:
    return {
        "symbol": symbol,
        "period": period,
        "report_type": report_type,
        "has_data": False,
        "reason": reason,
        "last_updated": None,
    }


def get_financial_report_for_ticker(
    symbol: str,
    period: str = "quarter",
    report_types: list[str] | None = None,
) -> dict:
    """Cache-first: đọc từ Parquet, crawl nếu cần.

    Returns:
        {
          "symbol": str,
          "period": str,
          "balance_sheet": [...],
          "income_statement": [...],
          "cash_flow": [...],
          "coverage": {...}  # per report_type coverage notes
        }
    """
    symbol_upper = symbol.upper()
    if report_types is None:
        report_types = ["balance_sheet", "income_statement", "cash_flow"]

    result: dict = {
        "symbol": symbol_upper,
        "period": period,
        "balance_sheet": [],
        "income_statement": [],
        "cash_flow": [],
        "coverage": {},
        "data_source": "cache",
        "last_updated": None,
    }

    for rt in report_types:
        path = _find_latest_parquet(rt, period)

        if path is None:
            # No file at all — need to crawl
            logger.info("No cached file for %s/%s. Attempting crawl...", rt, period)
            try:
                _crawl_and_save(symbol_upper, period, rt)
                path = _find_latest_parquet(rt, period)
            except Exception as exc:
                logger.warning("Crawl failed for %s/%s: %s", rt, period, exc)

        if path is None or not path.exists():
            result["coverage"][rt] = _coverage_note(
                symbol_upper, period, rt,
                "Chưa có dữ liệu trong storage. Pipeline crawl cần được chạy trước."
            )
            continue

        try:
            df = _load_parquet(path)
            col = _ticker_col(df)
            if col is None:
                result["coverage"][rt] = _coverage_note(
                    symbol_upper, period, rt,
                    "File Parquet không có cột ticker/symbol."
                )
                continue

            filtered = df[df[col].str.upper() == symbol_upper]
            if filtered.empty:
                result["coverage"][rt] = _coverage_note(
                    symbol_upper, period, rt,
                    f"Mã {symbol_upper} không tìm thấy trong dữ liệu hiện có. "
                    "Doanh nghiệp có thể chưa niêm yết hoặc không thuộc danh sách đã crawl."
                )
                continue

            records = filtered.astype(object).where(pd.notna(filtered), None).to_dict(orient="records")
            result[rt] = records
            result["coverage"][rt] = {
                "symbol": symbol_upper,
                "period": period,
                "report_type": rt,
                "has_data": True,
                "records": len(records),
                "source_file": path.name,
                "last_updated": datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat(),
            }
            result["last_updated"] = result["coverage"][rt]["last_updated"]
            result["data_source"] = "parquet_cache"

        except Exception as exc:
            logger.exception("Error reading %s: %s", path, exc)
            result["coverage"][rt] = _coverage_note(
                symbol_upper, period, rt,
                f"Lỗi đọc file: {exc}"
            )

    return result


def _crawl_and_save(symbol: str, period: str, report_type: str) -> None:
    """Crawl một symbol cụ thể từ vnstock và lưu Parquet."""
    from src.pipeline.fetch_financial_reports import FinancialReportFetcher

    FINANCIAL_RAW_DIR.mkdir(parents=True, exist_ok=True)
    fetcher = FinancialReportFetcher(
        source="VCI",
        period=period,
        output_dir=str(FINANCIAL_RAW_DIR),
    )
    data = fetcher.fetch_all(
        symbols=[symbol],
        exclude_financial=False,
        delay_seconds=1.0,
    )
    fetcher.save_data(data, file_format="parquet")
    logger.info("Crawl & save complete for %s/%s/%s", symbol, period, report_type)


def list_available_symbols(period: str = "quarter") -> list[str]:
    """Trả về danh sách mã đã có trong storage."""
    symbols: set[str] = set()
    for rt in ("balance_sheet", "income_statement", "cash_flow"):
        path = _find_latest_parquet(rt, period)
        if path and path.exists():
            try:
                df = _load_parquet(path)
                col = _ticker_col(df)
                if col:
                    symbols.update(df[col].str.upper().unique())
            except Exception:
                pass
    return sorted(symbols)


def get_ingestion_summary() -> dict:
    """Trả về tóm tắt về dữ liệu đã kéo về (cho Dashboard widget)."""
    summary = {
        "balance_sheet_records": 0,
        "income_statement_records": 0,
        "cash_flow_records": 0,
        "total_symbols": 0,
        "last_crawl_at": None,
        "storage_size_mb": 0.0,
    }

    all_symbols: set[str] = set()
    latest_mtime: float = 0.0
    total_size: int = 0

    for rt in ("balance_sheet", "income_statement", "cash_flow"):
        path = _find_latest_parquet(rt, "quarter")
        if path and path.exists():
            try:
                df = _load_parquet(path)
                count = len(df)
                summary[f"{rt}_records"] = count
                col = _ticker_col(df)
                if col:
                    all_symbols.update(df[col].str.upper().unique())
                mtime = path.stat().st_mtime
                if mtime > latest_mtime:
                    latest_mtime = mtime
                total_size += path.stat().st_size
            except Exception:
                pass

    summary["total_symbols"] = len(all_symbols)
    if latest_mtime:
        summary["last_crawl_at"] = datetime.fromtimestamp(latest_mtime, tz=timezone.utc).isoformat()
    summary["storage_size_mb"] = round(total_size / (1024 * 1024), 2)
    return summary
