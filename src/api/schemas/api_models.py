from pydantic import BaseModel
from typing import List, Optional

class HealthCheckResponse(BaseModel):
    status: str
    version: str
    environment: str

class CompanyResponse(BaseModel):
    ticker: str

class PriceRecord(BaseModel):
    date: str
    ticker: str
    open: float
    high: float
    low: float
    close: float
    volume: float

class PriceListResponse(BaseModel):
    ticker: str
    data: List[PriceRecord]
    page: int
    limit: int
    total_records: int

class CompanyListResponse(BaseModel):
    data: List[CompanyResponse]
    page: int
    limit: int
    total_records: int
