"""Run once: python create_admin.py"""
import asyncio
from app.db.engine import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User, Role
from sqlalchemy import select


async def main():
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == "admin@nigrani.local"))
        if existing.scalar_one_or_none():
            print("Admin already exists")
            return
        admin = User(
            full_name="System Administrator",
            email="admin@nigrani.local",
            password_hash=hash_password("Admin@12345"),
            role=Role.ADMIN,
            is_active=True,
            is_verified=True,
        )
        db.add(admin)
        await db.commit()
        print("Admin created: admin@nigrani.local / Admin@12345")


asyncio.run(main())
