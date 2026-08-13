"""
Lambda Collector — EventBridge Schedule trigger
================================================
Vai trò trong kiến trúc:
  EventBridge (daily schedule)
      → lambda_collector   ← file này
          → gọi VNStock API lấy OHLCV cho danh sách tickers
          → ghi file JSON thô lên S3 raw bucket

Sau khi file JSON xuất hiện trên S3 raw, S3 Event Notification sẽ
tự động trigger lambda_processor để transform sang Parquet.

Environment variables cần thiết:
  RAW_DATA_BUCKET        tên S3 raw bucket
  RAW_S3_PREFIX          prefix trong bucket (mặc định: ohlcv)
  DATA_PROVIDER          VNSTOCK_FREE hoặc YAHOO_FINANCE
  VNSTOCK_API_KEY        API key nếu dùng VNSTOCK_FREE
  TICKERS                danh sách tickers cách nhau dấu phẩy
                         (mặc định: VN30 index)
  START_DATE             ngày bắt đầu lấy data (mặc định: 3 năm trước)
  END_DATE               ngày kết thúc (mặc định: hôm nay)
"""

from __future__ import annotations

import io
import json
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any

import boto3

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Danh sách VN30 mặc định nếu không set env TICKERS
DEFAULT_TICKERS = [
    "ACB", "BCM", "BID", "BVH", "CTG", "FPT", "GAS", "GVR",
    "HDB", "HPG", "MBB", "MSN", "MWG", "PLX", "POW", "SAB",
    "SHB", "SSB", "SSI", "STB", "TCB", "TPB", "VCB", "VHM",
    "VIB", "VIC", "VJC", "VNM", "VPB", "VRE",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_tickers() -> list[str]:
    raw = os.environ.get("TICKERS", "")
    if not raw.strip():
        return DEFAULT_TICKERS
    return [t.strip().upper() for t in raw.split(",") if t.strip()]


def _get_date_range() -> tuple[str, str]:
    end = os.environ.get("END_DATE") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    start = os.environ.get("START_DATE") or (
        datetime.now(timezone.utc) - timedelta(days=365 * 3)
    ).strftime("%Y-%m-%d")
    return start, end


def _safe_ticker(value: str) -> str:
    ticker = value.strip().upper()
    if not re.fullmatch(r"[A-Z0-9._-]{1,20}", ticker):
        raise ValueError(f"Invalid ticker format: {value!r}")
    return ticker


def _write_to_s3(bucket: str, key: str, content: str, region: str) -> str:
    s3 = boto3.client("s3", region_name=region)
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=content.encode("utf-8"),
        ContentType="application/json",
    )
    uri = f"s3://{bucket}/{key}"
    logger.info("Written raw batch → %s", uri)
    return uri


# ---------------------------------------------------------------------------
# Core ingestion logic (standalone, no dependency on src.pipeline)
# ---------------------------------------------------------------------------

def _fetch_ticker(ticker: str, start: str, end: str, provider: str, api_key: str) -> dict:
    """Fetch OHLCV for a single ticker. Returns a RawTickerPayload-compatible dict."""
    requested_at = datetime.now(timezone.utc).isoformat()
    records: list[dict] = []
    error_code = "OK"
    status = "PASS"

    try:
        if provider == "YAHOO_FINANCE":
            import requests as http_requests
            symbol = f"{ticker}.VN"
            url = (
                f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
                f"?range=5y&interval=1d"
            )
            headers = {"User-Agent": "Mozilla/5.0"}
            resp = http_requests.get(url, headers=headers, timeout=15)
            resp.raise_for_status()
            chart = resp.json().get("chart", {}).get("result", [])
            if not chart:
                raise ValueError("NO_DATA: Yahoo returned empty result")
            data = chart[0]
            timestamps = data.get("timestamp", [])
            quote = data.get("indicators", {}).get("quote", [{}])[0]
            import pandas as pd
            dt_series = pd.to_datetime(timestamps, unit="s", utc=True)
            df = pd.DataFrame({
                "trading_date": dt_series.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "open_price": quote.get("open", []),
                "high_price": quote.get("high", []),
                "low_price": quote.get("low", []),
                "close_price": quote.get("close", []),
                "volume": quote.get("volume", []),
            }).dropna()
            df.insert(0, "ticker", ticker)
            records = df.to_dict(orient="records")

        else:  # VNSTOCK_FREE
            # Set API key once before import, not inside loop
            if api_key:
                os.environ.setdefault("VNSTOCK_API_KEY", api_key)
            from vnstock import Market
            import pandas as pd
            equity = Market().equity(ticker)
            frame = equity.ohlcv(start=start, end=end, resolution="1D")
            if frame is None or (hasattr(frame, "empty") and frame.empty):
                raise ValueError("NO_DATA: vnstock returned empty frame")
            df = frame if hasattr(frame, "columns") else pd.DataFrame(frame)
            df = df.rename(columns={
                "time": "trading_date",
                "open": "open_price",
                "high": "high_price",
                "low": "low_price",
                "close": "close_price",
            })
            df.insert(0, "ticker", ticker)
            records = df[["ticker", "trading_date", "open_price", "high_price",
                          "low_price", "close_price", "volume"]].to_dict(orient="records")

    except Exception as exc:
        logger.warning("Failed to fetch %s: %s", ticker, exc)
        msg = str(exc).lower()
        if "rate limit" in msg:
            error_code = "RATE_LIMIT"
        elif "no_data" in msg or "no data" in msg:
            error_code = "NO_DATA"
        elif "invalid" in msg or "not found" in msg:
            error_code = "INVALID_TICKER"
        else:
            error_code = "SOURCE_ERROR"
        status = "FAIL"

    return {
        "metadata": {
            "schema_version": "1.0",
            "provider": provider,
            "ticker": ticker,
            "status": status,
            "error_code": error_code,
            "rows": len(records),
            "requested_at": requested_at,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        },
        "records": records,
    }


# ---------------------------------------------------------------------------
# Lambda handler
# ---------------------------------------------------------------------------

def handler(event: dict, context: Any) -> dict:
    """
    EventBridge Schedule → lambda_collector → S3 raw bucket.

    EventBridge payload example (tự động từ scheduler):
    {
      "source": "aws.scheduler",
      "detail-type": "Scheduled Event"
    }

    Có thể override qua manual invoke:
    {
      "tickers": ["FPT", "VNM"],
      "start_date": "2024-01-01",
      "end_date": "2024-12-31"
    }
    """
    logger.info("Collector triggered. Event: %s", json.dumps(event))

    # Config từ env vars hoặc event payload (manual invoke)
    bucket = os.environ["RAW_DATA_BUCKET"]
    prefix = os.environ.get("RAW_S3_PREFIX", "ohlcv").rstrip("/")
    region = os.environ.get("AWS_DEFAULT_REGION", "ap-southeast-1")
    provider = os.environ.get("DATA_PROVIDER", "VNSTOCK_FREE").upper()
    api_key = os.environ.get("VNSTOCK_API_KEY", "")

    # Tickers và date range — event payload override env vars
    tickers_input = event.get("tickers")
    if tickers_input:
        tickers = [_safe_ticker(t) for t in tickers_input]
    else:
        tickers = _get_tickers()

    start, end = _get_date_range()
    if event.get("start_date"):
        start = event["start_date"]
    if event.get("end_date"):
        end = event["end_date"]

    logger.info(
        "Collecting %d tickers | provider=%s | %s → %s",
        len(tickers), provider, start, end,
    )

    # Fetch tất cả tickers
    payloads: list[dict] = []
    for ticker in tickers:
        payload = _fetch_ticker(ticker, start, end, provider, api_key)
        payloads.append(payload)
        logger.info(
            "Ticker %s: status=%s rows=%d",
            ticker,
            payload["metadata"]["status"],
            payload["metadata"]["rows"],
        )

    passed = sum(1 for p in payloads if p["metadata"]["status"] == "PASS")
    failed = len(payloads) - passed

    # Ghi toàn bộ batch lên S3 raw (1 file JSON)
    partition_date = datetime.now(timezone.utc).date()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    s3_key = (
        f"{prefix}/"
        f"year={partition_date:%Y}/"
        f"month={partition_date:%m}/"
        f"day={partition_date:%d}/"
        f"batch_{timestamp}.json"
    )
    content = json.dumps(payloads, ensure_ascii=False, default=str)
    raw_uri = _write_to_s3(bucket, s3_key, content, region)

    result = {
        "statusCode": 200,
        "raw_path": raw_uri,
        "requested": len(tickers),
        "passed": passed,
        "failed": failed,
        "date_range": {"start": start, "end": end},
    }

    # Trigger Lambda Email Automatically
    try:
        email_client = boto3.client("lambda", region_name=region)
        
        # Prepare detailed stats for each ticker
        ticker_details = []
        for p in payloads:
            meta = p["metadata"]
            ticker_details.append({
                "ticker": meta["ticker"],
                "status": meta["status"],
                "rows": meta["rows"],
                "completed_at": meta["completed_at"]
            })
            
        email_payload = {
            "email_type": "pipeline_summary",
            "to_email": os.environ.get("ADMIN_EMAIL", ""),
            "passed": passed,
            "failed": failed,
            "tickers": tickers,
            "date_range": {"start": start, "end": end},
            "ticker_details": ticker_details
        }
        email_client.invoke(
            FunctionName=os.environ.get("EMAIL_LAMBDA_NAME", "financial-data-email"),
            InvocationType="Event", # Async, does not wait for email to send
            Payload=json.dumps(email_payload).encode("utf-8")
        )
        logger.info("Triggered Email Notification Service successfully")
    except Exception as exc:
        logger.error("Could not trigger Email Lambda: %s", exc)

    logger.info("Collector complete: %s", result)
    return result
