from fastapi.testclient import TestClient
from src.api.main import app
import os
import pytest

client = TestClient(app)

def test_health_check():
    """Kiểm tra API /health (Task K04)"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "environment" in data

def test_get_companies():
    """Kiểm tra API /companies có hỗ trợ phân trang (Task K09)"""
    response = client.get("/companies?page=1&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "page" in data
    assert "limit" in data
    assert "total_records" in data
    assert data["page"] == 1
    assert data["limit"] == 10
    
    # Kiểm tra xem danh sách có trả về mã cổ phiếu hợp lệ không (Nếu dummy data có sẵn)
    if data["total_records"] > 0:
        assert len(data["data"]) > 0
        assert "ticker" in data["data"][0]

def test_get_prices():
    """Kiểm tra API /prices (Task K09)"""
    response = client.get("/prices?ticker=FPT&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "FPT"
    assert "data" in data
    assert "page" in data
    
    if data["total_records"] > 0:
        assert len(data["data"]) <= 5
        assert "close" in data["data"][0]

def test_export_prices():
    """Kiểm tra API /prices/export trả về file ZIP (Task K14)"""
    response = client.get("/prices/export?ticker=FPT&format=csv")
    
    # Nếu server báo 404 (chưa có data FPT) thì bỏ qua test
    if response.status_code == 404:
        pytest.skip("Chưa có data FPT để test Export")
        
    assert response.status_code == 200
    # Đảm bảo Content-Type là file ZIP
    assert response.headers["content-type"] == "application/zip"
    assert "attachment; filename=FPT_export.zip" in response.headers["content-disposition"]
