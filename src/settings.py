from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Shared runtime configuration loaded from environment variables / .env file."""

    app_name: str = "Financial Data Platform API"
    environment: str = "local"
    data_provider: str = "VNSTOCK_FREE"
    vnstock_api_key: SecretStr = SecretStr("")
    vnstock_requests_per_minute: int = 60
    data_provider_api_key: SecretStr = SecretStr("")

    # JWT Authentication
    jwt_secret_key: str = "financial_data_lake_jwt_secret_key_local_poc"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    # Local filesystem paths (used when environment=local)
    raw_data_dir: Path = Path("data/raw/ohlcv")
    curated_data_dir: Path = Path("data/curated/ohlcv")
    seed_raw_data_dir: Path = Path("reports/raw/ohlcv")
    universe_path: Path = Path("universe/ticker_universe_v1.csv")

    # CORS
    cors_origins: str = "http://localhost:8501,http://localhost:5173,http://127.0.0.1:5173"

    # AWS S3 (production)
    raw_data_bucket: str = ""
    curated_data_bucket: str = ""
    raw_s3_prefix: str = "ohlcv"
    curated_s3_prefix: str = "ohlcv"

    # AWS Athena (production)
    athena_database: str = "financial_data_lake"
    athena_table: str = "ohlcv"
    athena_output_bucket: str = ""

    # AWS
    aws_region: str = "ap-southeast-1"

    # SQS (used by lambda_collector → lambda_worker pattern)
    sqs_queue_url: str = ""

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ------------------------------------------------------------------
    # Derived properties
    # ------------------------------------------------------------------

    @property
    def is_cloud(self) -> bool:
        return self.environment.lower() not in ("local", "test")

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
    def raw_s3_path(self) -> str:
        return f"s3://{self.raw_data_bucket}/{self.raw_s3_prefix}"

    @property
    def curated_s3_path(self) -> str:
        return f"s3://{self.curated_data_bucket}/{self.curated_s3_prefix}"

    @property
    def athena_output_location(self) -> str:
        bucket = self.athena_output_bucket or self.raw_data_bucket
        return f"s3://{bucket.rstrip('/')}/athena-results/"

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
