from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Shared runtime configuration loaded from environment variables/.env."""

    app_name: str = "Financial Data Platform API"
    environment: str = "local"
    data_provider: str = "VNSTOCK_FREE"
    vnstock_api_key: SecretStr = SecretStr("")
    vnstock_requests_per_minute: int = 60
    data_provider_api_key: SecretStr = SecretStr("")

    raw_data_dir: Path = Path("data/raw/ohlcv")
    curated_data_dir: Path = Path("data/curated/ohlcv")
    seed_raw_data_dir: Path = Path("reports/raw/ohlcv")
    universe_path: Path = Path("universe/ticker_universe_v1.csv")
    cors_origins: str = (
        "http://localhost:8501,http://localhost:5173,"
        "http://127.0.0.1:5173,http://localhost:80,http://localhost"
    )

    # ─── Database ─────────────────────────────────────────────────────────────
    database_url: str = (
        "postgresql+asyncpg://app_user:changeme_local@localhost:5432/financial_platform"
    )

    # ─── JWT Auth ─────────────────────────────────────────────────────────────
    jwt_secret_key: SecretStr = SecretStr("super_secret_dev_key_change_in_prod")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 30

    # ─── Email / SMTP ─────────────────────────────────────────────────────────
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_tls: bool = False
    smtp_user: str = ""
    smtp_password: SecretStr = SecretStr("")
    email_from: str = "noreply@financial-platform.local"

    # ─── AWS (Cloud) ──────────────────────────────────────────────────────────
    aws_region: str = "ap-southeast-1"
    aws_profile: str = "default"
    ses_from_email: str = "your-email@example.com"

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    def resolve_path(self, value: Path) -> Path:
        return value if value.is_absolute() else PROJECT_ROOT / value

    @property
    def raw_path(self) -> Path:
        return self.resolve_path(self.raw_data_dir)

    @property
    def curated_path(self) -> Path:
        return self.resolve_path(self.curated_data_dir)

    @property
    def seed_raw_path(self) -> Path:
        return self.resolve_path(self.seed_raw_data_dir)

    @property
    def universe_file(self) -> Path:
        return self.resolve_path(self.universe_path)

    @property
    def allowed_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
