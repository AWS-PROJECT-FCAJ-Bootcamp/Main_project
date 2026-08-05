"""Async SQLAlchemy engine + session factory for the Financial Platform."""
from __future__ import annotations

import logging
from typing import AsyncGenerator

import duckdb
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.settings import settings

logger = logging.getLogger(__name__)

# ─── PostgreSQL (async) ────────────────────────────────────────────────────────
engine = create_async_engine(
    settings.database_url,
    echo=settings.environment == "local",
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: yields an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ─── DuckDB (analytics / Parquet reads) ───────────────────────────────────────
try:
    _duckdb_con = duckdb.connect(database=":memory:", read_only=False)
    logger.info("DuckDB in-memory connection initialized")
except Exception:
    logger.exception("Unable to initialize DuckDB")
    _duckdb_con = None


def get_db_connection() -> duckdb.DuckDBPyConnection | None:
    """Return the process-wide DuckDB analytics connection (Parquet reads)."""
    return _duckdb_con
