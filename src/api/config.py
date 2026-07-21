from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Data Platform API"
    environment: str = "local"
    data_path: str = "src/api/data/dummy_prices.parquet"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
