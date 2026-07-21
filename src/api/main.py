from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.config import settings
from src.api.schemas.api_models import HealthCheckResponse
from src.api.routers import companies, prices

app = FastAPI(
    title=settings.app_name,
    description="Backend API kết nối DuckDB cho hệ thống Local Data Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies.router)
app.include_router(prices.router)

@app.get("/health", response_model=HealthCheckResponse, tags=["Health Check"])
def health_check():
    """API kiểm tra trạng thái sức khỏe của Server (Task K04)"""
    return {
        "status": "ok",
        "version": "1.0.0",
        "environment": settings.environment
    }
