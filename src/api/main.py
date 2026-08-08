from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from src.api.config import settings
from src.api.routers import auth, companies, pipeline, prices, users
from src.api.schemas.api_models import HealthCheckResponse

app = FastAPI(
    title=settings.app_name,
    description="Consumption & User Service API for Financial Data Lake",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# All routes under /api/v1 — single registration, no duplicates
API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(companies.router, prefix=API_PREFIX)
app.include_router(prices.router, prefix=API_PREFIX)
app.include_router(pipeline.router, prefix=API_PREFIX)

# Keep root-level routes for backward compatibility with existing frontend calls
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(companies.router)
app.include_router(prices.router)
app.include_router(pipeline.router)


@app.get("/health", response_model=HealthCheckResponse, tags=["Health Check"])
def health_check():
    """Lightweight health probe — no filesystem or S3 access."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "environment": settings.environment,
        "provider": settings.data_provider,
        # Avoid filesystem glob on Lambda — report cloud readiness via config
        "data_ready": settings.is_cloud or settings.curated_path.exists(),
        "curated_files": -1 if settings.is_cloud else (
            len(list(settings.curated_path.rglob("*.parquet")))
            if settings.curated_path.exists() else 0
        ),
    }


# AWS Lambda handler via Mangum
handler = Mangum(app, lifespan="off")
