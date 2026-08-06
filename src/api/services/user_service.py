import logging
import os
import sqlite3
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from src.api.services.auth_service import hash_password, verify_password

logger = logging.getLogger(__name__)


class BaseUserService(ABC):
    """Abstract Base Class for User & Watchlist Service (Swappable for Local SQLite & AWS DynamoDB)."""

    @abstractmethod
    def register_user(self, email: str, password: str, full_name: str) -> dict[str, Any]:
        """Register a new user."""

    @abstractmethod
    def authenticate_user(self, email: str, password: str) -> dict[str, Any] | None:
        """Authenticate user by email and password."""

    @abstractmethod
    def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        """Retrieve user profile by user_id."""

    @abstractmethod
    def add_to_watchlist(self, user_id: str, ticker: str, note: str = "") -> dict[str, Any]:
        """Add ticker to user's watchlist."""

    @abstractmethod
    def get_watchlist(self, user_id: str) -> list[dict[str, Any]]:
        """Retrieve user's watchlist."""

    @abstractmethod
    def remove_from_watchlist(self, user_id: str, ticker: str) -> bool:
        """Remove ticker from user's watchlist."""


class LocalSQLiteUserService(BaseUserService):
    """Local SQLite implementation storing users and watchlists in data/users.db."""

    def __init__(self, db_path: Path = Path("data/users.db")):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        # Enable WAL (Write-Ahead Logging) mode and fast synchronous settings
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    role TEXT DEFAULT 'user'
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS watchlists (
                    user_id TEXT NOT NULL,
                    ticker TEXT NOT NULL,
                    added_at TEXT NOT NULL,
                    note TEXT DEFAULT '',
                    PRIMARY KEY (user_id, ticker),
                    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
                )
            """)
            # Create high-performance indexes for email lookups & user watchlists
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);")
            conn.commit()

    def register_user(self, email: str, password: str, full_name: str) -> dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT user_id FROM users WHERE LOWER(email) = LOWER(?)", (email,))
            if cursor.fetchone():
                raise ValueError(f"Email '{email}' already registered")

            user_id = f"usr_{uuid.uuid4().hex[:12]}"
            hashed_pwd = hash_password(password)
            created_at = datetime.now(timezone.utc).isoformat()

            cursor.execute(
                "INSERT INTO users (user_id, email, password_hash, full_name, created_at, role) VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, email.lower(), hashed_pwd, full_name, created_at, "user"),
            )
            conn.commit()

            return {
                "user_id": user_id,
                "email": email.lower(),
                "full_name": full_name,
                "created_at": created_at,
                "role": "user",
            }

    def authenticate_user(self, email: str, password: str) -> dict[str, Any] | None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email,))
            row = cursor.fetchone()
            if not row:
                return None

            user_dict = dict(row)
            if not verify_password(password, user_dict["password_hash"]):
                return None

            return {
                "user_id": user_dict["user_id"],
                "email": user_dict["email"],
                "full_name": user_dict["full_name"],
                "created_at": user_dict["created_at"],
                "role": user_dict["role"],
            }

    def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT user_id, email, full_name, created_at, role FROM users WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def add_to_watchlist(self, user_id: str, ticker: str, note: str = "") -> dict[str, Any]:
        normalized_ticker = ticker.upper().strip()
        added_at = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO watchlists (user_id, ticker, added_at, note) VALUES (?, ?, ?, ?)",
                (user_id, normalized_ticker, added_at, note),
            )
            conn.commit()

        return {
            "user_id": user_id,
            "ticker": normalized_ticker,
            "added_at": added_at,
            "note": note,
        }

    def get_watchlist(self, user_id: str) -> list[dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT user_id, ticker, added_at, note FROM watchlists WHERE user_id = ? ORDER BY added_at DESC",
                (user_id,),
            )
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    def remove_from_watchlist(self, user_id: str, ticker: str) -> bool:
        normalized_ticker = ticker.upper().strip()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM watchlists WHERE user_id = ? AND ticker = ?",
                (user_id, normalized_ticker),
            )
            conn.commit()
            return cursor.rowcount > 0


class DynamoDBUserService(BaseUserService):
    """AWS DynamoDB implementation for production deployment on AWS Cloud."""

    def __init__(self, region_name: str = "ap-southeast-1"):
        import boto3
        self.dynamodb = boto3.resource("dynamodb", region_name=region_name)
        self.users_table = self.dynamodb.Table(os.environ.get("DYNAMODB_USERS_TABLE", "Users"))
        self.watchlist_table = self.dynamodb.Table(os.environ.get("DYNAMODB_WATCHLIST_TABLE", "UserWatchlists"))

    def register_user(self, email: str, password: str, full_name: str) -> dict[str, Any]:
        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        created_at = datetime.now(timezone.utc).isoformat()
        hashed_pwd = hash_password(password)

        item = {
            "user_id": user_id,
            "email": email.lower(),
            "password_hash": hashed_pwd,
            "full_name": full_name,
            "created_at": created_at,
            "role": "user",
        }
        self.users_table.put_item(Item=item)
        return {k: v for k, v in item.items() if k != "password_hash"}

    def authenticate_user(self, email: str, password: str) -> dict[str, Any] | None:
        response = self.users_table.query(
            IndexName="EmailIndex",
            KeyConditionExpression=boto3.dynamodb.conditions.Key("email").eq(email.lower())
        )
        items = response.get("Items", [])
        if not items:
            return None
        user = items[0]
        if not verify_password(password, user["password_hash"]):
            return None
        return {k: v for k, v in user.items() if k != "password_hash"}

    def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        response = self.users_table.get_item(Key={"user_id": user_id})
        item = response.get("Item")
        if item:
            item.pop("password_hash", None)
        return item

    def add_to_watchlist(self, user_id: str, ticker: str, note: str = "") -> dict[str, Any]:
        normalized_ticker = ticker.upper().strip()
        added_at = datetime.now(timezone.utc).isoformat()
        item = {
            "user_id": user_id,
            "ticker": normalized_ticker,
            "added_at": added_at,
            "note": note,
        }
        self.watchlist_table.put_item(Item=item)
        return item

    def get_watchlist(self, user_id: str) -> list[dict[str, Any]]:
        response = self.watchlist_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("user_id").eq(user_id)
        )
        return response.get("Items", [])

    def remove_from_watchlist(self, user_id: str, ticker: str) -> bool:
        normalized_ticker = ticker.upper().strip()
        self.watchlist_table.delete_item(
            Key={"user_id": user_id, "ticker": normalized_ticker}
        )
        return True
