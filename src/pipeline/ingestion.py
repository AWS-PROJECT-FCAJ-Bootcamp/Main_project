from __future__ import annotations

import io
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path

import boto3
import pandas as pd
from pydantic import ValidationError

from src.pipeline.models import IngestionMetadata, OhlcvRecord, RawTickerPayload
from src.pipeline.source import MarketDataSource, build_market_data_source
from src.settings import Settings, get_settings

logger = logging.getLogger(__name__)

SOURCE_COLUMNS = ["time", "open", "high", "low", "close", "volume"]


def classify_source_error(error: Exception) -> str:
    message = str(error).lower()
    if any(token in message for token in ("rate limit", "ratelimit", "giới hạn api")):
        return "RATE_LIMIT"
    if any(token in message for token in ("no data", "emptydata", "no rows")):
        return "NO_DATA"
    if any(token in message for token in ("invalid", "not found", "symbol")):
        return "INVALID_TICKER"
    if isinstance(error, ValidationError) or "bad_data" in message:
        return "BAD_DATA"
    return "SOURCE_ERROR"


def normalize_history(ticker: str, frame: pd.DataFrame) -> list[OhlcvRecord]:
    missing = [col for col in SOURCE_COLUMNS if col not in frame.columns]
    if missing:
        raise ValueError(f"BAD_DATA: missing source columns {missing}")
    normalized = (
        frame[SOURCE_COLUMNS]
        .rename(columns={
            "time": "trading_date",
            "open": "open_price",
            "high": "high_price",
            "low": "low_price",
            "close": "close_price",
        })
        .copy()
    )
    normalized.insert(0, "ticker", ticker.upper())
    return [OhlcvRecord.model_validate(row) for row in normalized.to_dict(orient="records")]


def _safe_ticker(value: str) -> str:
    ticker = value.strip().upper()
    if not re.fullmatch(r"[A-Z0-9._-]{1,20}", ticker):
        raise ValueError(f"Invalid ticker: {value!r}")
    return ticker


def _write_to_s3(config: Settings, s3_key: str, content: str) -> str:
    """Write a JSON string to S3. Returns the full s3:// URI."""
    s3 = boto3.client("s3", region_name=config.aws_region)
    s3.put_object(
        Bucket=config.raw_data_bucket,
        Key=s3_key,
        Body=content.encode("utf-8"),
        ContentType="application/json",
    )
    uri = f"s3://{config.raw_data_bucket}/{s3_key}"
    logger.info("Wrote raw batch to %s", uri)
    return uri


def _write_to_local(config: Settings, output_dir: Path, filename: str, content: str) -> str:
    """Write a JSON string to local filesystem. Returns the file path string."""
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / filename
    tmp_path = output_path.with_suffix(".json.tmp")
    tmp_path.write_text(content, encoding="utf-8")
    tmp_path.replace(output_path)
    return str(output_path)


def ingest_tickers(
    tickers: list[str],
    start: str,
    end: str,
    interval: str = "1D",
    *,
    source: MarketDataSource | None = None,
    config: Settings | None = None,
) -> dict:
    config = config or get_settings()
    source = source or build_market_data_source(config)
    clean_tickers = list(dict.fromkeys(_safe_ticker(t) for t in tickers))
    if not clean_tickers:
        raise ValueError("At least one ticker is required")

    payloads: list[RawTickerPayload] = []
    for ticker in clean_tickers:
        requested_at = datetime.now(timezone.utc)
        attempts = 1
        try:
            frame, attempts = source.history(ticker, start, end, interval)
            if frame is None or frame.empty:
                raise ValueError("NO_DATA: provider returned no rows")
            records = normalize_history(ticker, frame)
            metadata = IngestionMetadata(
                provider=source.provider_name,
                ticker=ticker,
                status="PASS",
                error_code="OK",
                rows=len(records),
                attempts=attempts,
                requested_at=requested_at,
                completed_at=datetime.now(timezone.utc),
            )
        except Exception as error:
            logger.warning("Ingestion failed for %s: %s", ticker, error)
            metadata = IngestionMetadata(
                provider=source.provider_name,
                ticker=ticker,
                status="FAIL",
                error_code=classify_source_error(error),
                rows=0,
                attempts=attempts,
                requested_at=requested_at,
                completed_at=datetime.now(timezone.utc),
            )
            records = []
        payloads.append(RawTickerPayload(metadata=metadata, records=records))

    partition_date = datetime.now().astimezone().date()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    filename = f"batch_{timestamp}.json"
    content = json.dumps(
        [p.model_dump(mode="json") for p in payloads],
        ensure_ascii=False,
        indent=2,
    )

    if config.is_cloud:
        # Write to S3 under hive-style date partitions
        s3_key = (
            f"{config.raw_s3_prefix.rstrip('/')}/"
            f"year={partition_date:%Y}/"
            f"month={partition_date:%m}/"
            f"day={partition_date:%d}/"
            f"{filename}"
        )
        raw_path = _write_to_s3(config, s3_key, content)
    else:
        output_dir = (
            config.raw_path
            / f"year={partition_date:%Y}"
            / f"month={partition_date:%m}"
            / f"day={partition_date:%d}"
        )
        raw_path = _write_to_local(config, output_dir, filename, content)

    return {
        "raw_path": raw_path,
        "requested": len(clean_tickers),
        "passed": sum(p.metadata.status == "PASS" for p in payloads),
        "failed": sum(p.metadata.status == "FAIL" for p in payloads),
        "details": [p.metadata.model_dump(mode="json") for p in payloads],
    }
