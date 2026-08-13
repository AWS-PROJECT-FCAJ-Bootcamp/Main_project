"""
Unit tests targeting edge cases and uncovered branches in DataService to reach >=80% coverage.
Follows AAA pattern and clean unit testing practices.
"""

from unittest.mock import MagicMock, patch
import pandas as pd
import pytest

from src.api.services.data_service import DataService


# ==============================================================================
# FIXTURES
# ==============================================================================

@pytest.fixture
def mock_db_conn():
    """Fixture providing a mocked database connection."""
    conn = MagicMock()
    # Mock default execution result
    mock_df = pd.DataFrame({"ticker": ["AAA"], "trading_date": ["2023-01-01"], "close_price": [10.0]})
    conn.execute.return_value.df.return_value = mock_df
    # For fetchone count queries
    conn.execute.return_value.fetchone.return_value = [1]
    return conn

@pytest.fixture
def mock_config():
    """Fixture providing a mocked Settings config."""
    config = MagicMock()
    config.is_cloud = False
    # Mock paths so we can pretend data exists
    config.curated_path.exists.return_value = True
    return config

@pytest.fixture
def mock_config_cloud():
    """Fixture providing a mocked Settings config for cloud."""
    config = MagicMock()
    config.is_cloud = True
    config.curated_data_bucket = "test-bucket"
    return config

@pytest.fixture
def data_service(mock_db_conn, mock_config):
    """Fixture initializing DataService with mocked dependencies."""
    # Ensure _has_data returns True for local mode tests
    with patch.object(DataService, '_has_data', return_value=True):
        service = DataService(db_conn=mock_db_conn, config=mock_config)
        yield service

@pytest.fixture
def data_service_cloud(mock_db_conn, mock_config_cloud):
    with patch.object(DataService, '_has_data', return_value=True):
        service = DataService(db_conn=mock_db_conn, config=mock_config_cloud)
        yield service



# ==============================================================================
# TEST SUITE: FINANCIAL RATIOS
# ==============================================================================

class TestDataServiceFinancials:
    """Tests for financial data retrieval branches including edge cases."""

    def test_get_financial_ratios_local(self, data_service, mock_config):
        # Arrange
        ticker = "AAA"
        mock_path = mock_config.curated_path.parent / "financial_ratios" / f"ticker={ticker}" / "ratios.parquet"
        mock_path.exists.return_value = True
        
        # Act
        with patch("pandas.read_parquet", return_value=pd.DataFrame({"ticker": ["AAA"], "roa": [1.5]})):
            result = data_service.get_financial_ratios(ticker=ticker)

        # Assert
        assert result is not None
        assert len(result) == 1
        assert result[0]["roa"] == 1.5

    def test_get_financial_ratios_returns_none_when_no_data(self, data_service, mock_config):
        # Arrange: File doesn't exist
        ticker = "UNKNOWN"
        mock_path = mock_config.curated_path.parent / "financial_ratios" / f"ticker={ticker}" / "ratios.parquet"
        mock_path.exists.return_value = False

        # Act
        result = data_service.get_financial_ratios(ticker=ticker)

        # Assert
        assert result is None


# ==============================================================================
# TEST SUITE: GET PRICES
# ==============================================================================

class TestDataServicePrices:
    """Tests for calculation and aggregation methods on price history."""

    def test_get_prices_with_date_range(self, data_service, mock_db_conn):
        # Arrange
        mock_df = pd.DataFrame({
            "ticker": ["VCB", "VCB"],
            "trading_date": ["2023-01-01", "2023-01-02"],
            "open_price": [80.0, 81.5],
            "high_price": [80.0, 81.5],
            "low_price": [80.0, 81.5],
            "close_price": [80.0, 81.5],
            "volume": [1000, 2000],
            "return_pct": [0.0, 0.0],
            "ma20": [80.0, 81.0],
            "rsi_14": [50.0, 50.0]
        })
        mock_db_conn.execute.return_value.df.return_value = mock_df
        mock_db_conn.execute.return_value.fetchone.return_value = [2]

        # Act
        result = data_service.get_prices(
            ticker="VCB", 
            start_date="2023-01-01", 
            end_date="2023-01-02",
            page=1,
            limit=10
        )

        # Assert
        assert result is not None
        assert len(result["data"]) == 2
        assert result["total_records"] == 2
        assert result["ticker"] == "VCB"

    def test_get_prices_returns_empty_if_no_data_available(self, data_service):
        # Temporarily mock _has_data to return False
        with patch.object(DataService, '_has_data', return_value=False):
            result = data_service.get_prices("AAA", None, None, 1, 10)
            assert len(result["data"]) == 0
            assert result["total_records"] == 0


# ==============================================================================
# TEST SUITE: GET COMPANIES
# ==============================================================================

class TestDataServiceCompanies:
    def test_get_companies_handles_empty_search(self, data_service, mock_db_conn):
        # Arrange
        mock_db_conn.execute.return_value.fetchall.return_value = [("FPT",), ("SSI",)]
        
        # Act
        with patch("pandas.read_csv", return_value=pd.DataFrame()):
            # Fallback to no metadata when read_csv returns empty
            result = data_service.get_companies(page=1, limit=10, search="", exchange="ALL", industry="ALL")
            
        # Assert
        assert result is not None
        assert len(result["data"]) == 2
        assert result["total_records"] == 2

    def test_get_companies_cloud(self, data_service_cloud):
        with patch.object(data_service_cloud, '_athena_query', return_value=pd.DataFrame({"ticker": ["FPT", "VNM"]})):
            with patch("pandas.read_csv", return_value=pd.DataFrame()):
                result = data_service_cloud.get_companies(page=1, limit=10)
                assert result["total_records"] == 2
                assert len(result["data"]) == 2

# ==============================================================================
# TEST SUITE: GET PRICES
# ==============================================================================

class TestDataServicePricesCloud:
    def test_get_prices_cloud(self, data_service_cloud):
        mock_df = pd.DataFrame({
            "ticker": ["VNM"],
            "trading_date": ["2023-01-01"],
            "open_price": [80.0],
            "high_price": [80.0],
            "low_price": [80.0],
            "close_price": [80.0],
            "volume": [1000],
            "return_pct": [0.0],
            "ma20": [80.0],
            "rsi_14": [50.0],
            "total_cnt": [1]
        })
        with patch.object(data_service_cloud, '_athena_query', return_value=mock_df):
            result = data_service_cloud.get_prices("VNM", "2023-01-01", "2023-01-02", 1, 10)
            assert result["total_records"] == 1
            assert len(result["data"]) == 1

    def test_get_prices_for_export_cloud(self, data_service_cloud):
        with patch.object(data_service_cloud, '_athena_query', return_value=pd.DataFrame({"ticker": ["AAA"]})):
            result = data_service_cloud.get_prices_for_export("AAA")
            assert not result.empty

# ==============================================================================
# TEST SUITE: INGEST & RATIOS CLOUD
# ==============================================================================

class TestDataServiceIngestAndRatios:
    def test_get_financial_ratios_cloud(self, data_service_cloud):
        with patch("awswrangler.s3.read_parquet", return_value=pd.DataFrame({"ticker": ["AAA"], "roa": [1.5]})):
            result = data_service_cloud.get_financial_ratios("AAA")
            assert len(result) == 1
            assert result[0]["roa"] == 1.5

    def test_calculate_ratios(self, data_service):
        report = {
            "periods": ["2023"],
            "balance_sheet": [{"metric_code": "BS_01", "values": {"2023": 1000}}, {"metric_code": "BS_04", "values": {"2023": 5000}}, {"metric_code": "BS_06", "values": {"2023": 500}}],
            "income_statement": [{"metric_code": "IS_01", "values": {"2023": 2000}}, {"metric_code": "IS_06", "values": {"2023": 200}}],
            "cash_flow": [{"metric_code": "CF_01", "values": {"2023": 300}}]
        }
        with patch.object(data_service, 'get_financial_report', return_value=report):
            with patch("pandas.DataFrame.to_parquet"):
                res = data_service.calculate_ratios(["AAA"])
                assert res["status"] == "SUCCESS"

    def test_calculate_ratios_cloud(self, data_service_cloud):
        report = {
            "periods": ["2023"],
            "balance_sheet": [{"metric_code": "BS_01", "values": {"2023": 1000}}, {"metric_code": "BS_04", "values": {"2023": 5000}}, {"metric_code": "BS_06", "values": {"2023": 500}}],
            "income_statement": [{"metric_code": "IS_01", "values": {"2023": 2000}}, {"metric_code": "IS_06", "values": {"2023": 200}}],
            "cash_flow": [{"metric_code": "CF_01", "values": {"2023": 300}}]
        }
        with patch.object(data_service_cloud, 'get_financial_report', return_value=report):
            with patch("awswrangler.s3.to_parquet"):
                res = data_service_cloud.calculate_ratios(["AAA"])
                assert res["status"] == "SUCCESS"

    def test_vnstock_df_to_rows(self, data_service):
        mock_df = pd.DataFrame({
            "item": ["Tiền", "Tài sản"],
            "item_en": ["Cash", "Assets"],
            "item_id": ["current_assets", "total_assets"],
            "2023": [1000000000, 5000000000]
        })
        res = DataService._vnstock_df_to_rows("AAA", "YEARLY", mock_df, DataService._BS_MAP)
        assert len(res) == 2
        assert res[0]["value"] == 1.0 # 1000000000 / 1e9
        assert res[1]["value"] == 5.0 # 5000000000 / 1e9

    def test_ingest_reports_fallback(self, data_service):
        rows = [{"metric_code": "BS_01", "year": 2023, "quarter": 1, "value": 1.0}]
        with patch.object(DataService, '_vnstock_df_to_rows', return_value=rows):
            with patch("pandas.DataFrame.to_parquet"):
                with patch("vnstock.Finance") as mock_finance:
                    mock_finance.return_value.balance_sheet.return_value = pd.DataFrame()
                    res = data_service.ingest_reports(["AAA"], 2023, 2023, ["BALANCE_SHEET"])
                    assert res["status"] == "SUCCESS"

    def test_ingest_reports_cloud_fallback(self, data_service_cloud):
        rows = [{"metric_code": "BS_01", "year": 2023, "quarter": 1, "value": 1.0}]
        with patch.object(DataService, '_vnstock_df_to_rows', return_value=rows):
            with patch("awswrangler.s3.to_parquet"):
                with patch("vnstock.Finance") as mock_finance:
                    mock_finance.return_value.balance_sheet.return_value = pd.DataFrame()
                    mock_finance.return_value.income_statement.return_value = pd.DataFrame()
                    mock_finance.return_value.cash_flow.return_value = pd.DataFrame()
                    res = data_service_cloud.ingest_reports(["AAA"], 2023, 2023, ["BALANCE_SHEET", "INCOME_STATEMENT", "CASH_FLOW"])
                    assert res["status"] == "SUCCESS"