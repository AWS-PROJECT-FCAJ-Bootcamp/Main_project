import logging
import time
from typing import Protocol

import pandas as pd


logger = logging.getLogger(__name__)


class MarketDataSource(Protocol):
    provider_name: str

    def history(self, ticker: str, start: str, end: str, interval: str) -> tuple[pd.DataFrame, int]: ...


class VnstockVciSource:
    """Adapter around vnstock's VCI provider with bounded exponential retry."""

    provider_name = "VCI"

    def __init__(self, retries: int = 3, backoff_seconds: float = 2.0):
        self.retries = retries
        self.backoff_seconds = backoff_seconds

    def history(self, ticker: str, start: str, end: str, interval: str) -> tuple[pd.DataFrame, int]:
        # Import lazily so bootstrap/consumption does not require source connectivity.
        from vnstock.api.quote import Quote

        quote = Quote(symbol=ticker, source=self.provider_name)
        for attempt in range(1, self.retries + 1):
            try:
                frame = quote.history(start=start, end=end, interval=interval)
                return frame, attempt
            except Exception:
                logger.exception("VCI request failed for %s (attempt %s/%s)", ticker, attempt, self.retries)
                if attempt == self.retries:
                    raise
                time.sleep(self.backoff_seconds * (2 ** (attempt - 1)))
        raise RuntimeError(f"Unable to retrieve {ticker}")

