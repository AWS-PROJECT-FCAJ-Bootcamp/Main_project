from pathlib import Path

import duckdb
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from src.api.dependencies import get_data_service
from src.api.main import app
from src.api.services.data_service import DataService
from src.settings import Settings


@pytest.fixture
def client(tmp_path: Path):
    curated_dir = tmp_path / "curated" / "ticker=FPT"
    curated_dir.mkdir(parents=True)
    prices = pd.DataFrame(
        {
            "trading_date": pd.to_datetime(["2025-01-01", "2025-01-02"]),
            "open_price": [10.0, 11.0],
            "high_price": [12.0, 13.0],
            "low_price": [9.0, 10.0],
            "close_price": [11.0, 12.0],
            "volume": [1000, 1200],
            "return_pct": [None, 9.0909],
            "ma20": [11.0, 11.5],
            "rsi_14": [None, None],
        }
    )
    prices.to_parquet(curated_dir / "part-000.parquet", index=False)
    unknown_dir = tmp_path / "curated" / "ticker=VCB"
    unknown_dir.mkdir(parents=True)
    prices.to_parquet(unknown_dir / "part-000.parquet", index=False)
    universe = tmp_path / "universe.csv"
    pd.DataFrame(
        [{"ticker": "FPT", "name": "FPT Corp", "market": "HOSE", "sector": "Technology"}]
    ).to_csv(universe, index=False)
    config = Settings(
        _env_file=None,
        curated_data_dir=tmp_path / "curated",
        raw_data_dir=tmp_path / "raw",
        seed_raw_data_dir=tmp_path / "seed",
        universe_path=universe,
    )
    connection = duckdb.connect(":memory:")
    app.dependency_overrides[get_data_service] = lambda: DataService(connection, config)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    connection.close()


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_companies_are_backed_by_curated_data(client):
    response = client.get("/companies?limit=10")
    assert response.status_code == 200
    assert response.json()["data"][0]["ticker"] == "FPT"
    assert {item["ticker"] for item in response.json()["data"]} == {"FPT", "VCB"}


def test_prices_contract_and_date_filter(client):
    response = client.get("/prices?ticker=fpt&start_date=2025-01-02")
    assert response.status_code == 200
    body = response.json()
    assert body["total_records"] == 1
    assert body["data"][0]["trading_date"] == "2025-01-02"
    assert body["data"][0]["close_price"] == 12.0


def test_export_returns_zip(client):
    response = client.get("/prices/export?ticker=FPT&format=csv")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
