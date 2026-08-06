from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

# Root-level router registration (for backwards compatibility with PoC endpoints)
app.include_router(companies.router)
app.include_router(prices.router)
app.include_router(pipeline.router)
app.include_router(auth.router)
app.include_router(users.router)

# Versioned API routes /api/v1
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(companies.router, prefix="/api/v1")
app.include_router(prices.router, prefix="/api/v1")
app.include_router(pipeline.router, prefix="/api/v1")


@app.get("/health", response_model=HealthCheckResponse, tags=["Health Check"])
def health_check():
    curated_files = (
        len(list(settings.curated_path.rglob("*.parquet")))
        if settings.curated_path.exists()
        else 0
    )
    return {
        "status": "ok",
        "version": "1.0.0",
        "environment": settings.environment,
        "provider": settings.data_provider,
        "data_ready": curated_files > 0,
        "curated_files": curated_files,
    }
