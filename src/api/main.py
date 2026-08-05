"""FastAPI application entry point — v2.0.0"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.config import settings
from src.api.database import engine
from src.api.models import Base
from src.api.schemas.api_models import HealthCheckResponse
from src.api.routers import companies, pipeline, prices, financial_reports
from src.api.routers import auth, admin
from src.api.routers.dataset import router as dataset_router
from src.api.routers.extended_routers import (
    ratios_router,
    distress_router,
    sessions_router,
    ingestion_router,
    pipeline_router as pipeline_ctrl_router,
    ml_jobs_router,
    reports_router,
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    description=(
        "Financial Distress Analysis Platform API\n\n"
        "Phân tích rủi ro tài chính doanh nghiệp Việt Nam (HOSE, HNX, UPCOM)."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
# Auth & Admin
app.include_router(auth.router)
app.include_router(admin.router)

# Data routes (existing)
app.include_router(companies.router)
app.include_router(prices.router)
app.include_router(pipeline.router)
app.include_router(financial_reports.router)

# New routes (Sprint 2–5)
app.include_router(ratios_router)
app.include_router(distress_router)
app.include_router(sessions_router)
app.include_router(ingestion_router)
app.include_router(pipeline_ctrl_router)
app.include_router(ml_jobs_router)
app.include_router(reports_router)
app.include_router(dataset_router)


# ─── Lifecycle ────────────────────────────────────────────────────────────────

async def seed_initial_users() -> None:
    """Seed default admin and guest users if they don't exist in DB."""
    from sqlalchemy import select
    from src.api.database import AsyncSessionLocal
    from src.api.models import User, UserRole
    from src.api.services.auth_service import hash_password

    async with AsyncSessionLocal() as session:
        try:
            # Seed Admin
            res_admin = await session.execute(select(User).where(User.full_name == "Admin"))
            if not res_admin.scalar_one_or_none():
                admin_user = User(
                    full_name="Admin",
                    hashed_password=hash_password("admin123456"),
                    role=UserRole.admin,
                )
                session.add(admin_user)
                logger.info("Seeded default admin user: Admin")

            # Seed Guest
            res_guest = await session.execute(select(User).where(User.full_name == "Guest"))
            if not res_guest.scalar_one_or_none():
                guest_user = User(
                    full_name="Guest",
                    hashed_password=hash_password("guest123456"),
                    role=UserRole.guest,
                )
                session.add(guest_user)
                logger.info("Seeded default guest user: Guest")

            await session.commit()
        except Exception as e:
            logger.warning(f"Seed users notice: {e}")
            await session.rollback()


@app.on_event("startup")
async def on_startup() -> None:
    """Create all DB tables if not exists and seed default accounts."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_initial_users()
    logger.info("Database tables ensured — Financial Platform v2.0.0 ready")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await engine.dispose()
    logger.info("Database engine disposed")


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthCheckResponse, tags=["Health"])
def health_check():
    curated_files = (
        len(list(settings.curated_path.rglob("*.parquet")))
        if settings.curated_path.exists()
        else 0
    )
    return {
        "status": "ok",
        "version": "2.0.0",
        "environment": settings.environment,
        "provider": settings.data_provider,
        "data_ready": curated_files > 0,
        "curated_files": curated_files,
    }
