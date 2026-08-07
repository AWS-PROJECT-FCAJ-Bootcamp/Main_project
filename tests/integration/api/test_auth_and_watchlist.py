import pytest
from fastapi.testclient import TestClient

from src.api.dependencies import get_user_service
from src.api.main import app
from src.api.services.user_service import LocalSQLiteUserService

client = TestClient(app)

pytestmark = pytest.mark.integration


def test_auth_register_and_login_flow(tmp_path):
    """Test user registration, login, profile retrieval, and watchlist flow in isolation."""
    # Use isolated SQLite database for test
    test_service = LocalSQLiteUserService(db_path=tmp_path / "test_users.db")
    app.dependency_overrides[get_user_service] = lambda: test_service

    try:
        # Register a new user
        register_payload = {
            "email": "trader@example.com",
            "password": "SecurePassword123",
            "full_name": "Nguyen Van A",
        }
        reg_response = client.post("/auth/register", json=register_payload)
        assert reg_response.status_code == 201
        reg_data = reg_response.json()
        assert reg_data["email"] == "trader@example.com"
        assert reg_data["full_name"] == "Nguyen Van A"
        assert "user_id" in reg_data

        # Duplicate registration should fail with 400
        dup_response = client.post("/auth/register", json=register_payload)
        assert dup_response.status_code == 400
        assert "already registered" in dup_response.json()["detail"]

        # Login with wrong password should fail with 401
        bad_login = client.post(
            "/auth/login",
            json={"email": "trader@example.com", "password": "WrongPassword"},
        )
        assert bad_login.status_code == 401

        # Login with correct password should return JWT access_token
        login_response = client.post(
            "/auth/login",
            json={"email": "trader@example.com", "password": "SecurePassword123"},
        )
        assert login_response.status_code == 200
        login_data = login_response.json()
        assert "access_token" in login_data
        token = login_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Access /auth/me profile
        me_response = client.get("/auth/me", headers=headers)
        assert me_response.status_code == 200
        assert me_response.json()["email"] == "trader@example.com"

        # Add ticker to watchlist
        wl_add = client.post(
            "/users/watchlist",
            json={"ticker": "fpt", "note": "Top Growth Stock"},
            headers=headers,
        )
        assert wl_add.status_code == 201
        assert wl_add.json()["ticker"] == "FPT"

        # Get watchlist
        wl_get = client.get("/users/watchlist", headers=headers)
        assert wl_get.status_code == 200
        assert wl_get.json()["total_records"] == 1
        assert wl_get.json()["data"][0]["ticker"] == "FPT"

        # Delete ticker from watchlist
        wl_del = client.delete("/users/watchlist/FPT", headers=headers)
        assert wl_del.status_code == 200
        assert wl_del.json()["status"] == "success"

        # Get watchlist after deletion
        wl_get_empty = client.get("/users/watchlist", headers=headers)
        assert wl_get_empty.status_code == 200
        assert wl_get_empty.json()["total_records"] == 0
    finally:
        app.dependency_overrides.clear()


def test_watchlist_requires_auth():
    """Unauthenticated requests to protected endpoints should be rejected with 401."""
    response = client.get("/users/watchlist")
    assert response.status_code == 401
