"""
Lambda Processor — S3 Event trigger (Process Layer / ETL)
==========================================================
Vai trò trong kiến trúc:
  S3 raw bucket (file JSON mới)
      → S3 Event Notification
          → lambda_processor   ← file này
              → đọc JSON từ S3 raw
              → làm sạch, tính MA20 / RSI14
              → ghi Parquet lên S3 curated (Hive partition: ticker=XXX)
              → trigger Glue Crawler cập nhật Data Catalog (tùy chọn)

Sau khi Parquet xuất hiện trên S3 curated, Glue Crawler cập nhật
schema → Athena có thể query ngay → lambda_reader (API) phục vụ frontend.

Environment variables cần thiết:
  CURATED_DATA_BUCKET    tên S3 curated bucket
  CURATED_S3_PREFIX      prefix trong bucket (mặc định: ohlcv)
  GLUE_CRAWLER_NAME      tên Glue Crawler để trigger sau ETL (tùy chọn)
  AWS_DEFAULT_REGION     region
"""

from __future__ import annotations

import io
import json
import logging
from datetime import datetime, timezone
from typing import Any

import boto3
import pandas as pd

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

CURATED_COLUMNS = [
    "ticker",
    "trading_date",
    "open_price",
    "high_price",
    "low_price",
    "close_price",
    "volume",
    "return_pct",
    "ma20",
    "rsi_14",
]


# ---------------------------------------------------------------------------
# S3 helpers
# ---------------------------------------------------------------------------

def _read_json_from_s3(bucket: str, key: str, region: str) -> list[dict]:
    """Đọc file JSON từ S3, trả về list of RawTickerPayload dicts."""
    s3 = boto3.client("s3", region_name=region)
    body = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
    payload = json.loads(body.decode("utf-8-sig"))
    return payload if isinstance(payload, list) else [payload]


def _write_parquet_to_s3(
    bucket: str, key: str, df: pd.DataFrame, region: str
) -> str:
    """Ghi DataFrame thành Parquet lên S3, trả về s3:// URI."""
    s3 = boto3.client("s3", region_name=region)
    buf = io.BytesIO()
    df.to_parquet(buf, index=False, engine="pyarrow")
    buf.seek(0)
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=buf.read(),
        ContentType="application/octet-stream",
    )
    uri = f"s3://{bucket}/{key}"
    logger.info("Written curated parquet → %s", uri)
    return uri


# ---------------------------------------------------------------------------
# ETL logic
# ---------------------------------------------------------------------------

def _extract_records(payloads: list[dict]) -> list[dict]:
    """Lấy records từ các payload có status PASS."""
    records: list[dict] = []
    for entry in payloads:
        meta = entry.get("metadata", {})
        if meta.get("status") not in (None, "PASS"):
            logger.warning(
                "Skipping ticker %s: status=%s error=%s",
                meta.get("ticker"), meta.get("status"), meta.get("error_code"),
            )
            continue
        records.extend(entry.get("records", []))
    return records


def _calculate_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Tính return_pct, MA20, RSI14 theo từng ticker."""
    df = df.sort_values(["ticker", "trading_date"]).reset_index(drop=True)
    grouped = df.groupby("ticker", group_keys=False)["close_price"]

    # Return %
    df["return_pct"] = grouped.pct_change(fill_method=None).mul(100)

    # MA20
    df["ma20"] = grouped.transform(lambda v: v.rolling(20, min_periods=1).mean())

    # RSI14
    def _rsi(series: pd.Series, period: int = 14) -> pd.Series:
        delta = series.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
        avg_loss = loss.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
        rs = avg_gain / avg_loss.replace(0, float("nan"))
        result = 100 - (100 / (1 + rs))
        return result.fillna(100).where(avg_gain.notna())

    df["rsi_14"] = grouped.transform(_rsi)
    df[["return_pct", "ma20", "rsi_14"]] = df[["return_pct", "ma20", "rsi_14"]].round(4)
    return df[CURATED_COLUMNS]


def _trigger_glue_crawler(crawler_name: str, region: str) -> None:
    """Trigger Glue Crawler để cập nhật Data Catalog sau khi có Parquet mới."""
    try:
        glue = boto3.client("glue", region_name=region)
        glue.start_crawler(Name=crawler_name)
        logger.info("Glue Crawler '%s' triggered successfully", crawler_name)
    except Exception as exc:
        # Không dừng pipeline nếu Crawler đang chạy hoặc lỗi nhỏ
        logger.warning("Could not trigger Glue Crawler '%s': %s", crawler_name, exc)


# ---------------------------------------------------------------------------
# Lambda handler
# ---------------------------------------------------------------------------

def handler(event: dict, context: Any) -> dict:
    """
    S3 Event Notification → lambda_processor → S3 curated bucket.

    S3 event payload (tự động):
    {
      "Records": [{
        "s3": {
          "bucket": {"name": "financial-data-raw-..."},
          "object": {"key": "ohlcv/year=2026/month=08/day=08/batch_xxx.json"}
        }
      }]
    }
    """
    import os
    curated_bucket = os.environ["CURATED_DATA_BUCKET"]
    curated_prefix = os.environ.get("CURATED_S3_PREFIX", "ohlcv").rstrip("/")
    region = os.environ.get("AWS_DEFAULT_REGION", "ap-southeast-1")
    crawler_name = os.environ.get("GLUE_CRAWLER_NAME", "")

    records = event.get("Records", [])
    if not records:
        logger.warning("No S3 records in event — nothing to process")
        return {"statusCode": 200, "message": "No records"}

    all_written: list[str] = []
    total_rows = 0
    total_tickers = 0

    for record in records:
        raw_bucket = record["s3"]["bucket"]["name"]
        raw_key = record["s3"]["object"]["key"]
        logger.info("Processing s3://%s/%s", raw_bucket, raw_key)

        # 1. Đọc JSON raw từ S3
        try:
            payloads = _read_json_from_s3(raw_bucket, raw_key, region)
        except Exception as exc:
            logger.error("Failed to read s3://%s/%s: %s", raw_bucket, raw_key, exc)
            continue

        # 2. Extract records từ các ticker PASS
        raw_records = _extract_records(payloads)
        if not raw_records:
            logger.warning("No valid records in %s — skipping", raw_key)
            continue

        # 3. Build DataFrame và validate
        df = pd.DataFrame(raw_records)
        required_cols = {"ticker", "trading_date", "open_price", "high_price",
                         "low_price", "close_price", "volume"}
        missing = required_cols - set(df.columns)
        if missing:
            logger.error("Missing columns %s in %s — skipping", missing, raw_key)
            continue

        # 4. Type coercion
        # utc=True parses tz-aware, then .dt.tz_convert(None) strips tz → naive datetime
        df["trading_date"] = (
            pd.to_datetime(df["trading_date"], utc=True)
            .dt.tz_convert(None)
            .dt.normalize()  # truncate time component → pure date at midnight
        )
        for col in ("open_price", "high_price", "low_price", "close_price"):
            df[col] = pd.to_numeric(df[col], errors="coerce")
        df["volume"] = pd.to_numeric(df["volume"], errors="coerce").fillna(0).astype(int)
        df = df.dropna(subset=["open_price", "close_price"])
        df = df.drop_duplicates(["ticker", "trading_date"], keep="last")

        # 5. Tính technical indicators
        curated = _calculate_indicators(df)

        # 6. Ghi Parquet lên S3 curated — 1 file per ticker (Hive partition)
        for ticker, ticker_df in curated.groupby("ticker", sort=True):
            key = f"{curated_prefix}/ticker={ticker}/part-000.parquet"
            uri = _write_parquet_to_s3(
                curated_bucket, key, ticker_df.drop(columns=["ticker"]), region
            )
            all_written.append(uri)

        total_rows += len(curated)
        total_tickers += curated["ticker"].nunique()
        logger.info(
            "Processed %s: %d rows, %d tickers",
            raw_key, len(curated), curated["ticker"].nunique(),
        )

    # 7. Trigger Glue Crawler nếu có config (cập nhật Data Catalog)
    if crawler_name and all_written:
        _trigger_glue_crawler(crawler_name, region)

    result = {
        "statusCode": 200,
        "processed_files": len(records),
        "total_rows": total_rows,
        "total_tickers": total_tickers,
        "written_files": len(all_written),
        "curated_paths": all_written[:5],  # log tối đa 5 paths
    }
    logger.info("Processor complete: %s", result)
    return result
