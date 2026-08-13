import pytest
from fastapi.testclient import TestClient

from src.api.dependencies import get_user_service
from src.api.main import app
from src.api.services.user_service import LocalSQLiteUserService

client = TestClient(app)
pytestmark = pytest.mark.integration


def test_financial_endpoints_flow(tmp_path):
    """Test registration, login, and requesting financial reports/ratios for valid and invalid tickers."""
    test_service = LocalSQLiteUserService(db_path=tmp_path / "test_users.db")
    app.dependency_overrides[get_user_service] = lambda: test_service

    try:
        # Register and login
        register_payload = {
            "email": "analyst@example.com",
            "password": "SecurePassword123",
            "full_name": "Financial Analyst",
        }
        client.post("/auth/register", json=register_payload)
        
        login_response = client.post(
            "/auth/login",
            json={"email": "analyst@example.com", "password": "SecurePassword123"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Ingest financial reports
        ingest_payload = {
            "tickers": ["FPT", "SSI", "HPG"],
            "start_year": 2019,
            "end_year": 2024,
            "report_types": ["BALANCE_SHEET", "INCOME_STATEMENT", "CASH_FLOW"]
        }
        ingest_res = client.post("/financial-reports/ingest", json=ingest_payload, headers=headers)
        assert ingest_res.status_code == 200
        assert ingest_res.json()["status"] == "SUCCESS"

        # Calculate ratios
        calc_payload = {
            "tickers": ["FPT", "SSI"]
        }
        calc_res = client.post("/financial-ratios/calculate", json=calc_payload, headers=headers)
        assert calc_res.status_code == 200
        assert calc_res.json()["status"] == "SUCCESS"

        # Request financial report for FPT
        report_response = client.get("/financial-reports/FPT", headers=headers)
        assert report_response.status_code == 200
        report_data = report_response.json()
        assert report_data["ticker"] == "FPT"
        assert report_data["period_type"] == "YEARLY"
        assert len(report_data["balance_sheet"]) > 0
        assert len(report_data["income_statement"]) > 0
        assert len(report_data["cash_flow"]) > 0

        # Request financial ratios for FPT
        ratios_response = client.get("/financial-ratios/FPT", headers=headers)
        assert ratios_response.status_code == 200
        ratios_data = ratios_response.json()
        assert ratios_data["ticker"] == "FPT"
        assert len(ratios_data["data"]) > 0

        # Request financial report for invalid ticker
        invalid_report_res = client.get("/financial-reports/INVALID_TICKER", headers=headers)
        assert invalid_report_res.status_code == 404
        assert "Không tìm thấy dữ liệu" in invalid_report_res.json()["detail"]

        # Request financial ratios for invalid ticker
        invalid_ratios_res = client.get("/financial-ratios/INVALID_TICKER", headers=headers)
        assert invalid_ratios_res.status_code == 404
        assert "Không tìm thấy dữ liệu" in invalid_ratios_res.json()["detail"]

    finally:
        app.dependency_overrides.clear()


def test_financial_endpoints_require_auth():
    """Verify that unauthenticated requests are rejected with 401."""
    res1 = client.get("/financial-reports/FPT")
    assert res1.status_code == 401

    res2 = client.get("/financial-ratios/FPT")
    assert res2.status_code == 401
