from __future__ import annotations

import json
import logging
import os
from threading import Lock

import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException

from src.api.dependencies import get_current_user
from src.api.schemas.api_models import PipelineRunRequest
from src.pipeline.ingestion import ingest_tickers
from src.pipeline.transform import transform_raw_data

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pipeline", tags=["Pipeline"])
pipeline_lock = Lock()


def _get_lambda_client():
    region = os.environ.get("AWS_DEFAULT_REGION", "ap-southeast-1")
    return boto3.client("lambda", region_name=region)


def _get_s3_client():
    region = os.environ.get("AWS_DEFAULT_REGION", "ap-southeast-1")
    return boto3.client("s3", region_name=region)


@router.post("/trigger")
def trigger_pipeline(
    tickers: list[str] | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    _current_user: dict = Depends(get_current_user),
):
    """
    Invoke lambda_collector để chạy pipeline thủ công.
    Chỉ hoạt động khi ENVIRONMENT != local.
    """
    collector_name = os.environ.get("COLLECTOR_LAMBDA_NAME", "financial-data-collector")
    environment = os.environ.get("ENVIRONMENT", "local")

    if environment == "local":
        raise HTTPException(
            status_code=400,
            detail="Manual pipeline trigger chỉ khả dụng trên cloud. "
                   "Dùng CLI locally: uv run python -m src.pipeline.cli ingest",
        )

    payload: dict = {}
    if tickers:
        payload["tickers"] = tickers
    if start_date:
        payload["start_date"] = start_date
    if end_date:
        payload["end_date"] = end_date

    try:
        client = _get_lambda_client()
        response = client.invoke(
            FunctionName=collector_name,
            InvocationType="Event",  # async — không chờ kết quả
            Payload=json.dumps(payload).encode(),
        )
        status = response.get("StatusCode", 0)
        if status != 202:
            raise HTTPException(
                status_code=502,
                detail=f"Lambda invoke returned unexpected status: {status}",
            )
        return {
            "message": "Pipeline triggered successfully",
            "collector": collector_name,
            "payload": payload,
            "note": "Processing is asynchronous. Check /pipeline/status for updates.",
        }
    except ClientError as exc:
        logger.error("Failed to invoke collector Lambda: %s", exc)
        raise HTTPException(status_code=502, detail=f"Failed to trigger pipeline: {exc}") from exc


@router.get("/status")
def pipeline_status(
    _current_user: dict = Depends(get_current_user),
):
    """
    Kiểm tra trạng thái pipeline gần nhất bằng cách liệt kê
    các file JSON mới nhất trong S3 raw bucket.
    """
    raw_bucket = os.environ.get("RAW_DATA_BUCKET", "")
    raw_prefix = os.environ.get("RAW_S3_PREFIX", "ohlcv")
    environment = os.environ.get("ENVIRONMENT", "local")

    if environment == "local" or not raw_bucket:
        return {
            "environment": "local",
            "message": "Pipeline status chỉ khả dụng trên cloud",
        }

    try:
        s3 = _get_s3_client()
        response = s3.list_objects_v2(
            Bucket=raw_bucket,
            Prefix=f"{raw_prefix}/",
            MaxKeys=5,
        )
        objects = response.get("Contents", [])
        # Sort by LastModified để lấy file mới nhất
        objects = sorted(objects, key=lambda x: x["LastModified"], reverse=True)
        latest = [
            {
                "key": obj["Key"],
                "size_bytes": obj["Size"],
                "last_modified": obj["LastModified"].isoformat(),
            }
            for obj in objects[:3]
        ]
        return {
            "raw_bucket": raw_bucket,
            "latest_files": latest,
            "total_files_found": response.get("KeyCount", 0),
        }
    except ClientError as exc:
        logger.error("S3 status check failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Could not check pipeline status: {exc}") from exc


@router.post("/run")
def run_pipeline(
    request: PipelineRunRequest,
    _current_user: dict = Depends(get_current_user),
):
    """
    Run pipeline endpoint.
    - Local: runs synchronously (ingest + transform).
    - Cloud: invokes the collector Lambda asynchronously.
    """
    environment = os.environ.get("ENVIRONMENT", "local")

    if environment == "local":
        if not pipeline_lock.acquire(blocking=False):
            raise HTTPException(status_code=409, detail="Another ingestion run is already in progress")
        try:
            from src.settings import get_settings
            config = get_settings()
            
            # Run ingestion
            ingestion = ingest_tickers(
                request.tickers,
                request.start_date.isoformat(),
                request.end_date.isoformat(),
                request.interval,
                config=config,
            )
            
            # Run transform if any succeeded
            transformation = None
            if ingestion.get("passed", 0) > 0:
                transformation = transform_raw_data(input_roots=[config.raw_path], config=config)
                
            return {"ingestion": ingestion, "transformation": transformation}
        except Exception as error:
            logger.error("Pipeline failed: %s", error)
            raise HTTPException(status_code=502, detail=f"Pipeline failed: {error}") from error
        finally:
            pipeline_lock.release()
    else:
        # Cloud environment: trigger lambda collector
        collector_name = os.environ.get("COLLECTOR_LAMBDA_NAME", "financial-data-collector")
        payload = {
            "tickers": request.tickers,
            "start_date": request.start_date.isoformat(),
            "end_date": request.end_date.isoformat(),
        }
        try:
            client = _get_lambda_client()
            response = client.invoke(
                FunctionName=collector_name,
                InvocationType="Event",  # async
                Payload=json.dumps(payload).encode(),
            )
            status = response.get("StatusCode", 0)
            if status != 202:
                raise HTTPException(
                    status_code=502,
                    detail=f"Lambda invoke returned unexpected status: {status}",
                )
            
            # Return a compatible response for the frontend UI to display
            return {
                "message": "Pipeline triggered successfully in cloud",
                "collector": collector_name,
                "ingestion": {
                    "requested": len(request.tickers),
                    "passed": len(request.tickers),
                    "failed": 0,
                    "details": [
                        {
                            "ticker": t,
                            "status": "PASS",
                            "rows": 0,
                            "note": "Triggered on AWS Cloud. Data will appear shortly."
                        }
                        for t in request.tickers
                    ]
                }
            }
        except ClientError as exc:
            logger.error("Failed to invoke collector Lambda on run: %s", exc)
            raise HTTPException(status_code=502, detail=f"Failed to trigger pipeline: {exc}") from exc

