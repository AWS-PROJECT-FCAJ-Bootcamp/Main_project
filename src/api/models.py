"""SQLAlchemy ORM Models for Financial Platform.

Tables:
    users           — user accounts (role: guest | admin)
    query_sessions  — named query contexts saved by users
    ingestion_logs  — records every crawl event per user for the Dashboard log widget
    pipeline_jobs   — pipeline run tracking (trigger + schedule)
    ml_jobs         — ML training job submissions (local script / SageMaker)
    refresh_tokens  — JWT refresh token storage (for invalidation on logout)
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    guest = "guest"
    admin = "admin"


class JobStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


# ─── User ─────────────────────────────────────────────────────────────────────

class User(Base):
    """Simplified user table: id, full_name, hashed_password, role."""
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), nullable=False, default=UserRole.guest
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )

    __table_args__ = (UniqueConstraint("full_name", name="uq_users_full_name"),)

    # relationships
    query_sessions: Mapped[list["QuerySession"]] = relationship(back_populates="user")
    ingestion_logs: Mapped[list["IngestionLog"]] = relationship(back_populates="user")
    ml_jobs: Mapped[list["MLJob"]] = relationship(back_populates="user")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user")

    def __repr__(self) -> str:
        return f"<User id={self.id} full_name={self.full_name} role={self.role}>"


# ─── QuerySession ─────────────────────────────────────────────────────────────

class QuerySession(Base):
    """Named query context saved by the user (e.g. symbols + date range)."""
    __tablename__ = "query_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # JSON payload: { symbols: [], date_from: "", date_to: "", period: "quarter"|"year", ... }
    params: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    # snapshot of the result metadata at save time
    result_meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow
    )

    user: Mapped["User"] = relationship(back_populates="query_sessions")
    ml_jobs: Mapped[list["MLJob"]] = relationship(back_populates="source_session")

    def __repr__(self) -> str:
        return f"<QuerySession id={self.id} name={self.name!r}>"


# ─── IngestionLog ─────────────────────────────────────────────────────────────

class IngestionLog(Base):
    """Tracks every data crawl event per user for the Dashboard cumulative log widget."""
    __tablename__ = "ingestion_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # What was fetched
    report_type: Mapped[str] = mapped_column(String(50), nullable=False)   # balance_sheet | income_statement | cash_flow | ohlcv
    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    period: Mapped[str] = mapped_column(String(20), nullable=False)         # quarter | year
    records_fetched: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    data_source: Mapped[str] = mapped_column(String(50), nullable=False, default="VCI")
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(back_populates="ingestion_logs")

    def __repr__(self) -> str:
        return f"<IngestionLog user={self.user_id} type={self.report_type} symbol={self.symbol}>"


# ─── PipelineJob ──────────────────────────────────────────────────────────────

class PipelineJob(Base):
    """Tracks pipeline runs (triggered manually or by scheduler)."""
    __tablename__ = "pipeline_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    triggered_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    job_type: Mapped[str] = mapped_column(String(50), nullable=False, default="full_crawl")
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, name="job_status"), nullable=False, default=JobStatus.queued
    )
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)       # crawl params
    log_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    total_records: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<PipelineJob id={self.id} status={self.status}>"


# ─── MLJob ────────────────────────────────────────────────────────────────────

class MLJob(Base):
    """ML training job submitted by user (local script stub / SageMaker on cloud)."""
    __tablename__ = "ml_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("query_sessions.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Training config: algorithm, features, train/test split, hyperparams
    config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, name="job_status"), nullable=False, default=JobStatus.queued
    )
    # Metrics after training: AUC, F1, Precision, Recall, Confusion Matrix
    metrics: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Path to serialized model artifact (local path or S3 URI on cloud)
    model_artifact_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    # SageMaker training job name (cloud only)
    sagemaker_job_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(back_populates="ml_jobs")
    source_session: Mapped["QuerySession | None"] = relationship(back_populates="ml_jobs")

    def __repr__(self) -> str:
        return f"<MLJob id={self.id} name={self.name!r} status={self.status}>"


# ─── RefreshToken ─────────────────────────────────────────────────────────────

class RefreshToken(Base):
    """JWT refresh token store for secure logout/invalidation."""
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")

    def __repr__(self) -> str:
        return f"<RefreshToken user={self.user_id} revoked={self.revoked}>"
