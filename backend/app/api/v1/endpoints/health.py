from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.deps import get_db

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "service": "nigrani-always"}


@router.get("/ready")
async def ready(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT 1"))
    result.scalar()
    return {"status": "ready", "database": "connected"}
