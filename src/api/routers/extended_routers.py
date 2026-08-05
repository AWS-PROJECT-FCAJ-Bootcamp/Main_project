"""Routers: ratios, distress, sessions, pipeline control, reports, ml_jobs."""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.database import get_db
from src.api.dependencies import require_active, require_admin
from src.api.models import (
    IngestionLog, MLJob, PipelineJob, QuerySession, User, JobStatus,
)
from src.api.services.cache_service import (
    get_financial_report_for_ticker,
    get_ingestion_summary,
    list_available_symbols,
)
from src.api.services.ratio_engine import (
    compute_distress_score,
    compute_financial_ratios,
)

# ─── Ratios ───────────────────────────────────────────────────────────────────

ratios_router = APIRouter(prefix="/ratios", tags=["Financial Ratios"])


@ratios_router.get("/{symbol}")
async def get_ratios(
    symbol: str,
    period: str = Query("quarter", description="quarter | year"),
    _user: User = Depends(require_active),
) -> dict:
    """Lấy toàn bộ chỉ số tài chính cho một mã cổ phiếu."""
    data = get_financial_report_for_ticker(symbol.upper(), period=period)
    if data.get("error"):
        raise HTTPException(status_code=404, detail=data["error"])

    result = compute_financial_ratios(
        data.get("balance_sheet", []),
        data.get("income_statement", []),
        data.get("cash_flow", []),
    )
    result["symbol"] = symbol.upper()
    result["period"] = period
    result["coverage"] = data.get("coverage", {})
    return result


# ─── Distress ─────────────────────────────────────────────────────────────────

distress_router = APIRouter(prefix="/distress", tags=["Distress Analysis"])


@distress_router.get("/{symbol}")
async def get_distress(
    symbol: str,
    period: str = Query("quarter"),
    target_period: str | None = Query(None, description="Kỳ cụ thể, e.g. '2024-Q3'"),
    _user: User = Depends(require_active),
) -> dict:
    """Trả về điểm distress và nhãn cho kỳ gần nhất."""
    data = get_financial_report_for_ticker(symbol.upper(), period=period)
    if data.get("error"):
        raise HTTPException(status_code=404, detail=data["error"])

    result = compute_distress_score(
        data.get("balance_sheet", []),
        data.get("income_statement", []),
        data.get("cash_flow", []),
        period=target_period,
    )
    result["symbol"] = symbol.upper()
    return result


@distress_router.get("")
async def get_distress_watchlist(
    period: str = Query("quarter"),
    _user: User = Depends(require_active),
) -> dict:
    """Trả về danh sách doanh nghiệp có distress_score cao nhất (top 20)."""
    symbols = list_available_symbols(period)[:50]  # limit for performance
    watchlist = []

    for sym in symbols:
        try:
            data = get_financial_report_for_ticker(sym, period=period)
            score_data = compute_distress_score(
                data.get("balance_sheet", []),
                data.get("income_statement", []),
                data.get("cash_flow", []),
            )
            if "distress_score" in score_data:
                watchlist.append({
                    "symbol": sym,
                    "distress_score": score_data["distress_score"],
                    "distress_status": score_data["distress_status"],
                    "distress_label": score_data["distress_label"],
                    "z_score": score_data.get("z_score"),
                    "period": score_data.get("period"),
                })
        except Exception:
            continue

    watchlist.sort(key=lambda x: x["distress_score"], reverse=True)
    return {"watchlist": watchlist[:20], "total_screened": len(symbols)}


# ─── Sessions ─────────────────────────────────────────────────────────────────

sessions_router = APIRouter(prefix="/sessions", tags=["Query Sessions"])


class SessionCreate(BaseModel):
    name: str
    description: str | None = None
    params: dict = {}
    result_meta: dict | None = None


class SessionOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    params: dict
    result_meta: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


@sessions_router.get("", response_model=list[SessionOut])
async def list_sessions(
    user: User = Depends(require_active),
    db: AsyncSession = Depends(get_db),
) -> list[SessionOut]:
    result = await db.execute(
        select(QuerySession)
        .where(QuerySession.user_id == user.id)
        .order_by(QuerySession.updated_at.desc())
    )
    return [SessionOut.model_validate(s) for s in result.scalars().all()]


@sessions_router.post("", response_model=SessionOut, status_code=201)
async def create_session(
    body: SessionCreate,
    user: User = Depends(require_active),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    session = QuerySession(
        user_id=user.id,
        name=body.name,
        description=body.description,
        params=body.params,
        result_meta=body.result_meta,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return SessionOut.model_validate(session)


@sessions_router.get("/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: uuid.UUID,
    user: User = Depends(require_active),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    result = await db.execute(
        select(QuerySession).where(
            QuerySession.id == session_id, QuerySession.user_id == user.id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session không tồn tại.")
    return SessionOut.model_validate(session)


@sessions_router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: uuid.UUID,
    user: User = Depends(require_active),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(QuerySession).where(
            QuerySession.id == session_id, QuerySession.user_id == user.id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session không tồn tại.")
    await db.delete(session)
    await db.commit()


# ─── Ingestion Log / Dashboard widget ─────────────────────────────────────────

ingestion_router = APIRouter(prefix="/ingestion", tags=["Ingestion"])


@ingestion_router.get("/summary")
async def get_ingestion_summary_endpoint(
    _user: User = Depends(require_active),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Dashboard widget: tóm tắt dữ liệu đã kéo về."""
    # Storage summary từ Parquet
    storage = get_ingestion_summary()

    # Per-user log từ DB
    user_total = (
        await db.execute(
            select(func.sum(IngestionLog.records_fetched))
            .where(IngestionLog.user_id == _user.id)
        )
    ).scalar() or 0

    user_events = (
        await db.execute(
            select(func.count(IngestionLog.id))
            .where(IngestionLog.user_id == _user.id)
        )
    ).scalar() or 0

    last_event = (
        await db.execute(
            select(IngestionLog)
            .where(IngestionLog.user_id == _user.id)
            .order_by(IngestionLog.triggered_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    return {
        **storage,
        "user_records_fetched": user_total,
        "user_ingestion_events": user_events,
        "user_last_ingestion": last_event.triggered_at.isoformat() if last_event else None,
    }


# ─── Pipeline Control ─────────────────────────────────────────────────────────

pipeline_router = APIRouter(prefix="/pipeline", tags=["Pipeline Control"])


class TriggerRequest(BaseModel):
    symbols: list[str] | None = None
    period: str = "quarter"
    exclude_financial: bool = False
    source: str = "VCI"


@pipeline_router.post("/trigger")
async def trigger_pipeline(
    body: TriggerRequest,
    user: User = Depends(require_active),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Trigger crawl on-demand. Job chạy background."""
    job = PipelineJob(
        triggered_by=user.id,
        job_type="on_demand_crawl",
        status=JobStatus.queued,
        config={
            "symbols": body.symbols,
            "period": body.period,
            "exclude_financial": body.exclude_financial,
            "source": body.source,
        },
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Fire and forget in background
    asyncio.create_task(_run_pipeline_job(str(job.id), body, str(user.id)))

    return {
        "job_id": str(job.id),
        "status": "queued",
        "message": "Pipeline đã được kích hoạt. Xem log tại /pipeline/jobs/{job_id}/logs",
    }


@pipeline_router.get("/jobs")
async def list_pipeline_jobs(
    user: User = Depends(require_active),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(PipelineJob).order_by(PipelineJob.created_at.desc()).limit(20)
    )
    jobs = result.scalars().all()
    return {
        "jobs": [
            {
                "id": str(j.id),
                "job_type": j.job_type,
                "status": j.status.value,
                "started_at": j.started_at.isoformat() if j.started_at else None,
                "finished_at": j.finished_at.isoformat() if j.finished_at else None,
                "total_records": j.total_records,
                "error_message": j.error_message,
                "created_at": j.created_at.isoformat(),
            }
            for j in jobs
        ]
    }


@pipeline_router.get("/jobs/{job_id}/logs")
async def stream_pipeline_logs(
    job_id: str,
    user: User = Depends(require_active),
    db: AsyncSession = Depends(get_db),
):
    """SSE stream log của pipeline job."""
    result = await db.execute(
        select(PipelineJob).where(PipelineJob.id == uuid.UUID(job_id))
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job không tồn tại")

    async def event_generator():
        log = job.log_output or "Đang chờ log..."
        yield f"data: {log}\n\n"
        if job.status in (JobStatus.queued, JobStatus.running):
            yield "data: [RUNNING] Job đang chạy...\n\n"
        else:
            yield f"data: [DONE] Job kết thúc với trạng thái: {job.status.value}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


async def _run_pipeline_job(job_id: str, body: TriggerRequest, user_id: str) -> None:
    """Background task: chạy pipeline crawl."""
    import logging
    from src.api.database import AsyncSessionLocal

    logger = logging.getLogger(__name__)
    try:
        from src.pipeline.fetch_financial_reports import FinancialReportFetcher
        from pathlib import Path

        fetcher = FinancialReportFetcher(
            source=body.source,
            period=body.period,
            output_dir="data/raw/financial_reports",
        )

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(PipelineJob).where(PipelineJob.id == uuid.UUID(job_id))
            )
            job = result.scalar_one_or_none()
            if not job:
                return
            job.status = JobStatus.running
            job.started_at = datetime.now(timezone.utc)
            await db.commit()

        data = fetcher.fetch_all(
            symbols=body.symbols,
            exclude_financial=body.exclude_financial,
            delay_seconds=1.5,
        )
        saved = fetcher.save_data(data, file_format="parquet")
        total = sum(len(df) for df in data.values() if df is not None and not df.empty)

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(PipelineJob).where(PipelineJob.id == uuid.UUID(job_id))
            )
            job = result.scalar_one_or_none()
            if job:
                job.status = JobStatus.completed
                job.finished_at = datetime.now(timezone.utc)
                job.total_records = total
                job.log_output = f"Hoàn thành. Lưu {len(saved)} file. Total records: {total}"

                # Log to ingestion_logs
                log_entry = IngestionLog(
                    user_id=uuid.UUID(user_id),
                    report_type="full_crawl",
                    symbol="*",
                    period=body.period,
                    records_fetched=total,
                    data_source=body.source,
                    success=True,
                )
                db.add(log_entry)
                await db.commit()

    except Exception as exc:
        logger.exception("Pipeline job %s failed: %s", job_id, exc)
        try:
            from src.api.database import AsyncSessionLocal
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(PipelineJob).where(PipelineJob.id == uuid.UUID(job_id))
                )
                job = result.scalar_one_or_none()
                if job:
                    job.status = JobStatus.failed
                    job.finished_at = datetime.now(timezone.utc)
                    job.error_message = str(exc)
                    await db.commit()
        except Exception:
            pass


# ─── ML Jobs ──────────────────────────────────────────────────────────────────

ml_jobs_router = APIRouter(prefix="/ml/jobs", tags=["ML Jobs"])


class MLJobCreate(BaseModel):
    name: str
    source_session_id: uuid.UUID | None = None
    config: dict = {}


class MLJobOut(BaseModel):
    id: uuid.UUID
    name: str
    status: str
    config: dict
    metrics: dict | None
    model_artifact_path: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
    error_message: str | None

    model_config = {"from_attributes": True}


@ml_jobs_router.get("", response_model=list[MLJobOut])
async def list_ml_jobs(
    user: User = Depends(require_active),
    db: AsyncSession = Depends(get_db),
) -> list[MLJobOut]:
    result = await db.execute(
        select(MLJob)
        .where(MLJob.user_id == user.id)
        .order_by(MLJob.created_at.desc())
    )
    jobs = result.scalars().all()
    return [
        MLJobOut(
            id=j.id, name=j.name, status=j.status.value,
            config=j.config, metrics=j.metrics,
            model_artifact_path=j.model_artifact_path,
            started_at=j.started_at, finished_at=j.finished_at,
            created_at=j.created_at, error_message=j.error_message,
        )
        for j in jobs
    ]


@ml_jobs_router.post("", status_code=201)
async def create_ml_job(
    body: MLJobCreate,
    user: User = Depends(require_active),
    db: AsyncSession = Depends(get_db),
) -> dict:
    job = MLJob(
        user_id=user.id,
        source_session_id=body.source_session_id,
        name=body.name,
        config=body.config,
        status=JobStatus.queued,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Fire background training (stub — full SageMaker integration in cloud phase)
    asyncio.create_task(_run_ml_job(str(job.id), body.config))

    return {
        "job_id": str(job.id),
        "status": "queued",
        "message": "ML job đã được gửi. Kết quả sẽ cập nhật tự động.",
    }


@ml_jobs_router.get("/{job_id}", response_model=MLJobOut)
async def get_ml_job(
    job_id: uuid.UUID,
    user: User = Depends(require_active),
    db: AsyncSession = Depends(get_db),
) -> MLJobOut:
    result = await db.execute(
        select(MLJob).where(MLJob.id == job_id, MLJob.user_id == user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="ML Job không tồn tại")
    return MLJobOut(
        id=job.id, name=job.name, status=job.status.value,
        config=job.config, metrics=job.metrics,
        model_artifact_path=job.model_artifact_path,
        started_at=job.started_at, finished_at=job.finished_at,
        created_at=job.created_at, error_message=job.error_message,
    )


async def _run_ml_job(job_id: str, config: dict) -> None:
    """Stub local ML training. Cloud: delegates to SageMaker."""
    import logging
    logger = logging.getLogger(__name__)
    await asyncio.sleep(2)  # simulate startup

    try:
        from src.api.database import AsyncSessionLocal
        import random

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(MLJob).where(MLJob.id == uuid.UUID(job_id)))
            job = result.scalar_one_or_none()
            if not job:
                return
            job.status = JobStatus.running
            job.started_at = datetime.now(timezone.utc)
            await db.commit()

        await asyncio.sleep(5)  # simulate training

        # Generate stub metrics
        metrics = {
            "auc": round(random.uniform(0.75, 0.92), 4),
            "f1": round(random.uniform(0.65, 0.85), 4),
            "precision": round(random.uniform(0.70, 0.90), 4),
            "recall": round(random.uniform(0.60, 0.85), 4),
            "accuracy": round(random.uniform(0.80, 0.93), 4),
            "algorithm": config.get("algorithm", "XGBoost"),
            "note": "Local stub training. Cloud: SageMaker training job.",
        }

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(MLJob).where(MLJob.id == uuid.UUID(job_id)))
            job = result.scalar_one_or_none()
            if job:
                job.status = JobStatus.completed
                job.finished_at = datetime.now(timezone.utc)
                job.metrics = metrics
                job.model_artifact_path = f"data/models/{job_id}/model.pkl"
                await db.commit()

    except Exception as exc:
        logger.exception("ML Job %s failed: %s", job_id, exc)
        try:
            from src.api.database import AsyncSessionLocal
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(MLJob).where(MLJob.id == uuid.UUID(job_id)))
                job = result.scalar_one_or_none()
                if job:
                    job.status = JobStatus.failed
                    job.error_message = str(exc)
                    job.finished_at = datetime.now(timezone.utc)
                    await db.commit()
        except Exception:
            pass


# ─── Reports ──────────────────────────────────────────────────────────────────

reports_router = APIRouter(prefix="/reports", tags=["Reports"])


@reports_router.get("/quarterly")
async def get_quarterly_report(
    period: str = Query("quarter"),
    _user: User = Depends(require_active),
) -> dict:
    """Tạo báo cáo distress hàng quý cho tất cả công ty trong storage."""
    symbols = list_available_symbols(period)[:100]
    report_rows = []

    for sym in symbols:
        try:
            data = get_financial_report_for_ticker(sym, period=period)
            dist = compute_distress_score(
                data.get("balance_sheet", []),
                data.get("income_statement", []),
                data.get("cash_flow", []),
            )
            if "distress_score" in dist:
                report_rows.append({
                    "symbol": sym,
                    "period": dist.get("period"),
                    "distress_score": dist["distress_score"],
                    "distress_status": dist["distress_status"],
                    "distress_label": dist["distress_label"],
                    "z_score": dist.get("z_score"),
                })
        except Exception:
            continue

    report_rows.sort(key=lambda x: x["distress_score"], reverse=True)
    high_risk = [r for r in report_rows if r["distress_status"] == "DISTRESS"]
    grey_zone = [r for r in report_rows if r["distress_status"] == "GREY"]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_companies": len(report_rows),
        "high_risk_count": len(high_risk),
        "grey_zone_count": len(grey_zone),
        "high_risk": high_risk[:20],
        "grey_zone": grey_zone[:20],
        "all_companies": report_rows,
    }
