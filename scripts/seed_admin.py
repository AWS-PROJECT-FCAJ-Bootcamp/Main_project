"""Seed script: tạo admin user lần đầu chạy hệ thống.

Usage:
    uv run python scripts/seed_admin.py

Tạo user admin với full_name/password từ biến môi trường hoặc giá trị mặc định (dev only).
"""
import asyncio
import os
import sys

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent))

from src.api.database import AsyncSessionLocal, engine
from src.api.models import Base, User, UserRole
from src.api.services.auth_service import hash_password
from sqlalchemy import select


ADMIN_NAME = os.getenv("SEED_ADMIN_NAME", "Admin")
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "admin123456")

GUEST_NAME = os.getenv("SEED_GUEST_NAME", "Guest")
GUEST_PASSWORD = os.getenv("SEED_GUEST_PASSWORD", "guest123456")


async def seed():
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if admin already exists
        result = await db.execute(select(User).where(User.full_name == ADMIN_NAME))
        existing = result.scalar_one_or_none()

        if existing:
            print(f"✅ Admin đã tồn tại: {ADMIN_NAME}")
        else:
            admin = User(
                full_name=ADMIN_NAME,
                hashed_password=hash_password(ADMIN_PASSWORD),
                role=UserRole.admin,
            )
            db.add(admin)
            print(f"✅ Đã tạo admin user:")
            print(f"   Tên:      {ADMIN_NAME}")
            print(f"   Password: {ADMIN_PASSWORD}")
            print(f"   Role:     admin")

        # Check if guest already exists
        result_guest = await db.execute(select(User).where(User.full_name == GUEST_NAME))
        existing_guest = result_guest.scalar_one_or_none()

        if existing_guest:
            print(f"✅ Guest đã tồn tại: {GUEST_NAME}")
        else:
            guest = User(
                full_name=GUEST_NAME,
                hashed_password=hash_password(GUEST_PASSWORD),
                role=UserRole.guest,
            )
            db.add(guest)
            print(f"✅ Đã tạo guest user:")
            print(f"   Tên:      {GUEST_NAME}")
            print(f"   Password: {GUEST_PASSWORD}")
            print(f"   Role:     guest")

        await db.commit()
        print()
        print("⚠️  Nhớ đổi mật khẩu sau khi đăng nhập lần đầu!")


if __name__ == "__main__":
    asyncio.run(seed())
