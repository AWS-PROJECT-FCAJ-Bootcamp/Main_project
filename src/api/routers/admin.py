"""Admin router: user management (admin only).

Endpoints:
    GET  /admin/users          — list all users with optional role filter
    DELETE /admin/users/{id}   — delete a user
    GET  /admin/stats          — platform summary stats
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.database import get_db
from src.api.dependencies import require_admin
from src.api.models import IngestionLog, MLJob, PipelineJob, User, UserRole

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class UserSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    role: str
    created_at: str

    model_config = {"from_attributes": True}


class AdminStats(BaseModel):
    total_users: int
    admin_users: int
    guest_users: int
    total_pipeline_jobs: int
    total_ml_jobs: int
    total_records_ingested: int


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserSummary])
async def list_users(
    role_filter: str | None = Query(default=None, alias="role"),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[UserSummary]:
    """List all users, optionally filtered by role."""
    stmt = select(User)

    if role_filter:
        try:
            stmt = stmt.where(User.role == UserRole(role_filter))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid role value. Must be one of: {[r.value for r in UserRole]}",
            )

    result = await db.execute(stmt.order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [
        UserSummary(
            id=u.id,
            full_name=u.full_name,
            role=u.role.value,
            created_at=u.created_at.isoformat(),
        )
        for u in users
    ]


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> None:
    """Delete a user (admin only). Cannot delete yourself."""
    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account.",
        )

    await db.delete(user)
    await db.commit()


@router.get("/stats", response_model=AdminStats)
async def platform_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AdminStats:
    """Return platform-wide summary statistics."""
    total_users = (await db.execute(func.count(User.id).select())).scalar() or 0
    admin_count = (
        await db.execute(select(func.count()).where(User.role == UserRole.admin))
    ).scalar() or 0
    guest_count = (
        await db.execute(select(func.count()).where(User.role == UserRole.guest))
    ).scalar() or 0
    total_pipeline = (await db.execute(select(func.count(PipelineJob.id)))).scalar() or 0
    total_ml = (await db.execute(select(func.count(MLJob.id)))).scalar() or 0
    total_records = (
        await db.execute(select(func.sum(IngestionLog.records_fetched)))
    ).scalar() or 0

    return AdminStats(
        total_users=total_users,
        admin_users=admin_count,
        guest_users=guest_count,
        total_pipeline_jobs=total_pipeline,
        total_ml_jobs=total_ml,
        total_records_ingested=total_records,
    )
