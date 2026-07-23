from datetime import date

from pydantic import BaseModel, Field

class HealthCheckResponse(BaseModel):
    status: str
    version: str
    environment: str
    provider: str
    data_ready: bool
    curated_files: int

class CompanyResponse(BaseModel):
    ticker: str
    name: str | None = None
    market: str | None = None
    sector: str | None = None

class PriceRecord(BaseModel):
    ticker: str
    trading_date: date
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    volume: float
    return_pct: float | None = None
    ma20: float | None = None
    rsi_14: float | None = None

class PriceListResponse(BaseModel):
    ticker: str
    data: list[PriceRecord]
    page: int
    limit: int
    total_records: int

class CompanyListResponse(BaseModel):
    data: list[CompanyResponse]
    page: int
    limit: int
    total_records: int


class PipelineRunRequest(BaseModel):
    tickers: list[str] = Field(min_length=1, max_length=20)
    start_date: date
    end_date: date
    interval: str = Field(default="1D", pattern="^(1D|1H)$")
