import logging
import os
import threading
import time
from collections.abc import Callable
from typing import Any, Protocol

import pandas as pd
import requests
from pydantic import SecretStr

from src.settings import Settings


logger = logging.getLogger(__name__)


class MarketDataSource(Protocol):
    provider_name: str

    def history(
        self, ticker: str, start: str, end: str, interval: str
    ) -> tuple[pd.DataFrame, int]: ...


class SourceConfigurationError(RuntimeError):
    """Raised before a provider request when source authentication is incomplete."""


class VnstockApiSource:
    """Authenticated Vnstock Free Unified API adapter with retry and rate limiting."""

    provider_name = "VNSTOCK_FREE"

    def __init__(
        self,
        api_key: SecretStr | str,
        *,
        requests_per_minute: int = 60,
        retries: int = 3,
        backoff_seconds: float = 2.0,
        market_factory: Callable[[], Any] | None = None,
        clock: Callable[[], float] = time.monotonic,
        sleeper: Callable[[float], None] = time.sleep,
    ):
        secret = api_key if isinstance(api_key, SecretStr) else SecretStr(api_key)
        if not secret.get_secret_value().strip():
            raise SourceConfigurationError(
                "VNSTOCK_API_KEY is required for authenticated live ingestion"
            )
        if requests_per_minute < 1 or requests_per_minute > 60:
            raise SourceConfigurationError(
                "VNSTOCK_REQUESTS_PER_MINUTE must be between 1 and 60 for Free tier"
            )
        if retries < 1:
            raise SourceConfigurationError("retries must be at least 1")

        self._api_key = secret
        self.requests_per_minute = requests_per_minute
        self.retries = retries
        self.backoff_seconds = backoff_seconds
        self._market_factory = market_factory
        self._clock = clock
        self._sleeper = sleeper
        self._last_request_at: float | None = None
        self._rate_lock = threading.Lock()

    def _create_market(self):
        os.environ["VNSTOCK_API_KEY"] = self._api_key.get_secret_value()
        if self._market_factory is not None:
            return self._market_factory()
        try:
            from vnstock import Market
        except ImportError as error:
            raise SourceConfigurationError(
                "vnstock 4.x is required for the authenticated Unified API adapter"
            ) from error
        return Market()

    def _wait_for_request_slot(self) -> None:
        minimum_interval = 60 / self.requests_per_minute
        with self._rate_lock:
            now = self._clock()
            if self._last_request_at is not None:
                remaining = minimum_interval - (now - self._last_request_at)
                if remaining > 0:
                    self._sleeper(remaining)
                    now = self._clock()
            self._last_request_at = now

    def history(
        self, ticker: str, start: str, end: str, interval: str
    ) -> tuple[pd.DataFrame, int]:
        if interval != "1D":
            raise ValueError("Vnstock Free source is configured for interval 1D only")

        equity = self._create_market().equity(ticker)
        for attempt in range(1, self.retries + 1):
            self._wait_for_request_slot()
            try:
                frame = equity.ohlcv(start=start, end=end, resolution="1D")
                return frame if isinstance(frame, pd.DataFrame) else pd.DataFrame(frame), attempt
            except Exception:
                logger.exception(
                    "Vnstock API request failed for %s (attempt %s/%s)",
                    ticker,
                    attempt,
                    self.retries,
                )
                if attempt == self.retries:
                    raise
                self._sleeper(self.backoff_seconds * (2 ** (attempt - 1)))
        raise RuntimeError(f"Unable to retrieve {ticker}")


class YahooFinanceSource:
    """Free Yahoo Finance API adapter (NO API KEY REQUIRED)."""

    provider_name = "YAHOO_FINANCE"

    def history(
        self, ticker: str, start: str, end: str, interval: str
    ) -> tuple[pd.DataFrame, int]:
        symbol = ticker.upper()
        candidates = [symbol]
        if not symbol.endswith(".VN") and "." not in symbol and "-" not in symbol:
            candidates.insert(0, f"{symbol}.VN")

        data_df = None

        # 1. Direct HTTP REST API from Yahoo Chart API (Free & No API Key Required)
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        for cand in candidates:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{cand}?range=5y&interval=1d"
            try:
                res = requests.get(url, headers=headers, timeout=10)
                if res.status_code == 200:
                    chart_result = res.json().get("chart", {}).get("result", [])
                    if chart_result and len(chart_result) > 0:
                        chart_data = chart_result[0]
                        timestamps = chart_data.get("timestamp", [])
                        quote = chart_data.get("indicators", {}).get("quote", [{}])[0]
                        if timestamps and quote:
                            df = pd.DataFrame({
                                "time": pd.to_datetime(timestamps, unit="s").dt.strftime("%Y-%m-%d"),
                                "open": quote.get("open", []),
                                "high": quote.get("high", []),
                                "low": quote.get("low", []),
                                "close": quote.get("close", []),
                                "volume": quote.get("volume", []),
                            }).dropna()
                            if not df.empty:
                                data_df = df
                                break
            except Exception as error:
                logger.warning("Yahoo Finance request failed for %s: %s", cand, error)
                continue

        # 2. Try yfinance library fallback if installed
        if data_df is None or data_df.empty:
            try:
                import yfinance as yf
                for cand in candidates:
                    df = yf.download(cand, start=start, end=end, interval="1d", progress=False)
                    if not df.empty:
                        if isinstance(df.columns, pd.MultiIndex):
                            df.columns = df.columns.get_level_values(0)
                        df = df.reset_index()
                        data_df = df
                        break
            except Exception:
                pass

        if data_df is None or data_df.empty:
            raise ValueError(f"NO_DATA: Yahoo Finance returned no rows for symbol {ticker}")

        return data_df, 1


def build_market_data_source(config: Settings) -> MarketDataSource:
    provider = config.data_provider.strip().upper()
    if provider == "YAHOO_FINANCE":
        return YahooFinanceSource()
    if provider == "VNSTOCK_FREE":
        return VnstockApiSource(
            config.vnstock_api_key,
            requests_per_minute=config.vnstock_requests_per_minute,
        )
    raise SourceConfigurationError(
        f"Unsupported DATA_PROVIDER for local PoC: {config.data_provider!r}"
    )
