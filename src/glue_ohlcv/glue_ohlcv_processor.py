import sys
import io
import json
import logging
import boto3
import pandas as pd

from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from pyspark.context import SparkContext

# Spark Context setup
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session

logger = logging.getLogger("GlueETLProcessor")
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

def read_json_from_s3(s3_client, bucket: str, key: str) -> list[dict]:
    body = s3_client.get_object(Bucket=bucket, Key=key)["Body"].read()
    payload = json.loads(body.decode("utf-8-sig"))
    return payload if isinstance(payload, list) else [payload]

def extract_records(payloads: list[dict]) -> list[dict]:
    records = []
    for entry in payloads:
        meta = entry.get("metadata", {})
        if meta.get("status") not in (None, "PASS"):
            logger.warning(f"Skipping ticker {meta.get('ticker')}: status={meta.get('status')}")
            continue
        records.extend(entry.get("records", []))
    return records

def calculate_indicators(df: pd.DataFrame) -> pd.DataFrame:
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

def main():
    # Nhận tham số động từ Console / Step Functions
    args = getResolvedOptions(
        sys.argv,
        [
            "JOB_NAME",
            "RAW_DATA_BUCKET",
            "RAW_KEY",
            "CURATED_DATA_BUCKET",
            "CURATED_S3_PREFIX",
            "GLUE_CRAWLER_NAME",
            "AWS_DEFAULT_REGION",
        ],
    )

    raw_bucket = args["RAW_DATA_BUCKET"]
    raw_key = args["RAW_KEY"]
    curated_bucket = args["CURATED_DATA_BUCKET"]
    curated_prefix = args["CURATED_S3_PREFIX"].rstrip("/")
    crawler_name = args.get("GLUE_CRAWLER_NAME", "ohlcv-crawler")
    region = args.get("AWS_DEFAULT_REGION", "ap-southeast-1")

    s3_client = boto3.client("s3", region_name=region)
    glue_client = boto3.client("glue", region_name=region)

    logger.info(f"Processing Raw JSON: s3://{raw_bucket}/{raw_key}")

    # 1. Đọc JSON từ S3 Raw
    payloads = read_json_from_s3(s3_client, raw_bucket, raw_key)
    raw_records = extract_records(payloads)

    if not raw_records:
        logger.warning(f"No valid records found in s3://{raw_bucket}/{raw_key}")
        return

    # 2. Build DataFrame & Validate
    df = pd.DataFrame(raw_records)
    df["trading_date"] = (
        pd.to_datetime(df["trading_date"], utc=True)
        .astype("int64") // 10**9
    )
    for col in ("open_price", "high_price", "low_price", "close_price"):
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["volume"] = pd.to_numeric(df["volume"], errors="coerce").fillna(0).astype(int)
    df = df.dropna(subset=["open_price", "close_price"]).drop_duplicates(["ticker", "trading_date"], keep="last")

    # 3. Tính MA20, RSI14, return_pct
    curated = calculate_indicators(df)

    # 4. Ghi Parquet theo Hive Partition chuẩn: ticker=XXX/part-000.parquet
    written_files = 0
    for ticker, ticker_df in curated.groupby("ticker", sort=True):
        key = f"{curated_prefix}/ticker={ticker}/part-000.parquet"
        buf = io.BytesIO()
        ticker_df.drop(columns=["ticker"]).to_parquet(buf, index=False, engine="pyarrow")
        buf.seek(0)
        s3_client.put_object(
            Bucket=curated_bucket,
            Key=key,
            Body=buf.read(),
            ContentType="application/octet-stream",
        )
        written_files += 1

    logger.info(f"Successfully wrote {written_files} Parquet partitions to s3://{curated_bucket}/{curated_prefix}/")

    # 5. Kích hoạt Crawler cập nhật Data Catalog
    if crawler_name:
        try:
            glue_client.start_crawler(Name=crawler_name)
            logger.info(f"Glue Crawler '{crawler_name}' triggered successfully.")
        except Exception as exc:
            logger.warning(f"Could not trigger Glue Crawler '{crawler_name}': {exc}")

if __name__ == "__main__":
    main()
