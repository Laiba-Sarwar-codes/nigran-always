import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.core.deps import require_admin
from app.models.user import User, Role, AuditLog
from app.schemas.auth import (
    AdminCreateUserRequest,
    PatchUserRequest,
    PatchUserStatusRequest,
    UserResponse,
    UserListResponse,
)
from app.services import auth as auth_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: AdminCreateUserRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
):
    try:
        user = await auth_service.admin_create_user(
            db, actor, data.full_name, data.email, data.password, data.role
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return user


@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    role: Role | None = Query(None),
    is_active: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = select(User)
    if search:
        q = q.where(or_(User.full_name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%")))
    if role:
        q = q.where(User.role == role)
    if is_active is not None:
        q = q.where(User.is_active == is_active)

    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()

    q = q.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    users = result.scalars().all()

    return UserListResponse(items=list(users), total=total, page=page, page_size=page_size)


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
async def patch_user(
    user_id: uuid.UUID,
    data: PatchUserRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if data.full_name is not None:
        user.full_name = data.full_name.strip()
    if data.email is not None:
        email = data.email.lower().strip()
        existing = await db.execute(select(User).where(User.email == email, User.id != user_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
        user.email = email

    log = AuditLog(
        actor_id=actor.id,
        action="admin_patch_user",
        resource_type="user",
        resource_id=str(user.id),
        extra_data=json.dumps(data.model_dump(exclude_none=True)),
    )
    db.add(log)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/users/{user_id}/status", response_model=UserResponse)
async def patch_user_status(
    user_id: uuid.UUID,
    data: PatchUserStatusRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
):
    if user_id == actor.id and not data.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = data.is_active
    log = AuditLog(
        actor_id=actor.id,
        action="admin_set_active" if data.is_active else "admin_deactivate",
        resource_type="user",
        resource_id=str(user.id),
    )
    db.add(log)
    await db.commit()
    await db.refresh(user)
    return user
