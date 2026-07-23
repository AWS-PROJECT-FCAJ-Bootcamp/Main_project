import json
from pathlib import Path

import pandas as pd

from src.pipeline.ingestion import ingest_tickers
from src.pipeline.transform import transform_raw_data
from src.settings import Settings


class FakeSource:
    provider_name = "TEST"

    def history(self, ticker: str, start: str, end: str, interval: str):
        return (
            pd.DataFrame(
                {
                    "time": pd.date_range("2025-01-01", periods=25),
                    "open": range(10, 35),
                    "high": [value + 2 for value in range(10, 35)],
                    "low": [value - 1 for value in range(10, 35)],
                    "close": [value + 1 for value in range(10, 35)],
                    "volume": [1000] * 25,
                }
            ),
            1,
        )


def make_settings(tmp_path: Path) -> Settings:
    return Settings(
        _env_file=None,
        raw_data_dir=tmp_path / "raw",
        curated_data_dir=tmp_path / "curated",
        seed_raw_data_dir=tmp_path / "seed",
        universe_path=tmp_path / "universe.csv",
    )


def test_ingestion_writes_valid_raw_payload(tmp_path):
    config = make_settings(tmp_path)
    result = ingest_tickers(
        ["fpt"],
        "2025-01-01",
        "2025-01-31",
        source=FakeSource(),
        config=config,
    )

    assert result["passed"] == 1
    payload = json.loads(Path(result["raw_path"]).read_text(encoding="utf-8"))
    assert payload[0]["metadata"]["provider"] == "TEST"
    assert payload[0]["metadata"]["rows"] == 25
    assert payload[0]["records"][0]["ticker"] == "FPT"


def test_raw_to_curated_pipeline(tmp_path):
    config = make_settings(tmp_path)
    ingest_tickers(
        ["FPT"],
        "2025-01-01",
        "2025-01-31",
        source=FakeSource(),
        config=config,
    )
    result = transform_raw_data(config=config)

    assert result["rows"] == 25
    assert result["tickers"] == 1
    curated = pd.read_parquet(config.curated_path / "ticker=FPT" / "part-000.parquet")
    assert {"return_pct", "ma20", "rsi_14"}.issubset(curated.columns)
    assert curated.iloc[-1]["ma20"] > 0

