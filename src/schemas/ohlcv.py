from pydantic import BaseModel, Field, field_validator
from datetime import datetime

class IngestionMetadata(BaseModel):
    version: str = Field("1.0")
    provider: str = Field(...)
    ingested_at: datetime = Field(default_factory=datetime.utcnow)

class DailyStockPrice(BaseModel):
    ticker: str = Field(..., min_length=3, max_length=5)
    trading_date: datetime = Field(...)
    open_price: float = Field(..., gt=0)
    high_price: float = Field(..., gt=0)
    low_price: float = Field(..., gt=0)
    close_price: float = Field(..., gt=0)
    volume: int = Field(..., ge=0)

    @field_validator('high_price')
    @classmethod
    def check_high_price(cls, v, info):
        if 'low_price' in info.data and v < info.data['low_price']:
            raise ValueError("Giá High không thể nhỏ hơn Low")
        return v