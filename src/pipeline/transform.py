from __future__ import annotations

import io
import json
import logging
from pathlib import Path

import boto3
import pandas as pd

from src.pipeline.models import OhlcvRecord
from src.settings import Settings, get_settings

logger = logging.getLogger(__name__)

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
# Raw record readers — local filesystem and S3
# ---------------------------------------------------------------------------

def _read_raw_records_local(input_roots: list[Path]) -> tuple[list[dict], int]:
    records: list[dict] = []
    files_read = 0
    seen: set[Path] = set()
    for root in input_roots:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*.json")):
            resolved = path.resolve()
            if resolved in seen:
                continue
            seen.add(resolved)
            payload = json.loads(path.read_text(encoding="utf-8-sig"))
            entries = payload if isinstance(payload, list) else [payload]
            for entry in entries:
                if entry.get("metadata", {}).get("status") not in (None, "PASS"):
                    continue
                for record in entry.get("records", []):
                    records.append(OhlcvRecord.model_validate(record).model_dump())
            files_read += 1
    return records, files_read


def _read_raw_records_s3(config: Settings) -> tuple[list[dict], int]:
    """List and read all raw JSON batch files from the S3 raw bucket."""
    s3 = boto3.client("s3", region_name=config.aws_region)
    prefix = config.raw_s3_prefix.rstrip("/") + "/"
    paginator = s3.get_paginator("list_objects_v2")

    records: list[dict] = []
    files_read = 0

    for page in paginator.paginate(Bucket=config.raw_data_bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            if not key.endswith(".json"):
                continue
            body = s3.get_object(Bucket=config.raw_data_bucket, Key=key)["Body"].read()
            payload = json.loads(body.decode("utf-8-sig"))
            entries = payload if isinstance(payload, list) else [payload]
            for entry in entries:
                if entry.get("metadata", {}).get("status") not in (None, "PASS"):
                    continue
                for record in entry.get("records", []):
                    records.append(OhlcvRecord.model_validate(record).model_dump())
            files_read += 1

    logger.info("Read %d raw files from S3 prefix %s", files_read, prefix)
    return records, files_read


# ---------------------------------------------------------------------------
# Technical indicator calculation
# ---------------------------------------------------------------------------

def _calculate_indicators(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.sort_values(["ticker", "trading_date"]).reset_index(drop=True)
    grouped_close = frame.groupby("ticker", group_keys=False)["close_price"]
    frame["return_pct"] = grouped_close.pct_change(fill_method=None).mul(100)
    frame["ma20"] = grouped_close.transform(
        lambda v: v.rolling(20, min_periods=1).mean()
    )

    def rsi(values: pd.Series, period: int = 14) -> pd.Series:
        delta = values.diff()
        gains = delta.clip(lower=0)
        losses = -delta.clip(upper=0)
        avg_gain = gains.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
        avg_loss = losses.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
        rs = avg_gain / avg_loss.replace(0, float("nan"))
        result = 100 - (100 / (1 + rs))
        return result.fillna(100).where(avg_gain.notna())

    frame["rsi_14"] = grouped_close.transform(rsi)
    frame[["return_pct", "ma20", "rsi_14"]] = (
        frame[["return_pct", "ma20", "rsi_14"]].round(4)
    )
    return frame[CURATED_COLUMNS]


# ---------------------------------------------------------------------------
# Parquet writers — local filesystem and S3
# ---------------------------------------------------------------------------

def _write_parquet_local(config: Settings, curated: pd.DataFrame) -> list[str]:
    config.curated_path.mkdir(parents=True, exist_ok=True)
    written: list[str] = []
    for ticker, ticker_frame in curated.groupby("ticker", sort=True):
        ticker_dir = config.curated_path / f"ticker={ticker}"
        ticker_dir.mkdir(parents=True, exist_ok=True)
        out = ticker_dir / "part-000.parquet"
        ticker_frame.drop(columns=["ticker"]).to_parquet(out, index=False)
        written.append(str(out))
    return written


def _write_parquet_s3(config: Settings, curated: pd.DataFrame) -> list[str]:
    """Write per-ticker Parquet files to S3 in Hive partition format."""
    s3 = boto3.client("s3", region_name=config.aws_region)
    prefix = config.curated_s3_prefix.rstrip("/")
    written: list[str] = []

    for ticker, ticker_frame in curated.groupby("ticker", sort=True):
        key = f"{prefix}/ticker={ticker}/part-000.parquet"
        buf = io.BytesIO()
        ticker_frame.drop(columns=["ticker"]).to_parquet(buf, index=False)
        buf.seek(0)
        s3.put_object(
            Bucket=config.curated_data_bucket,
            Key=key,
            Body=buf.read(),
            ContentType="application/octet-stream",
        )
        uri = f"s3://{config.curated_data_bucket}/{key}"
        written.append(uri)
        logger.debug("Wrote curated parquet: %s", uri)

    logger.info("Wrote %d curated parquet files to S3", len(written))
    return written


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def transform_raw_data(
    *,
    input_roots: list[Path] | None = None,
    config: Settings | None = None,
) -> dict:
    config = config or get_settings()

    if config.is_cloud:
        records, files_read = _read_raw_records_s3(config)
    else:
        roots = input_roots or [config.raw_path]
        records, files_read = _read_raw_records_local(roots)

    if not records:
        raise FileNotFoundError("No valid raw OHLCV records found")

    frame = pd.DataFrame(records)
    frame["trading_date"] = (
        pd.to_datetime(frame["trading_date"], utc=True).dt.tz_localize(None)
    )
    frame = frame.drop_duplicates(["ticker", "trading_date"], keep="last")
    curated = _calculate_indicators(frame)

    if config.is_cloud:
        written_files = _write_parquet_s3(config, curated)
    else:
        written_files = _write_parquet_local(config, curated)

    return {
        "input_files": files_read,
        "rows": len(curated),
        "tickers": curated["ticker"].nunique(),
        "output_files": written_files,
    }
