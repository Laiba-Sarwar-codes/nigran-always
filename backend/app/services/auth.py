import json
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
)
from app.models.user import User, RefreshSession, AuditLog, Role
from app.schemas.auth import RegisterRequest, LoginRequest


COOKIE_NAME_ACCESS = "access_token"
COOKIE_NAME_REFRESH = "refresh_token"


async def register_candidate(db: AsyncSession, data: RegisterRequest) -> User:
    email = data.email.lower().strip()
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise ValueError("Email already registered")

    user = User(
        full_name=data.full_name.strip(),
        email=email,
        password_hash=hash_password(data.password),
        role=Role.CANDIDATE,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    await db.flush()

    log = AuditLog(actor_id=user.id, action="register", resource_type="user", resource_id=str(user.id))
    db.add(log)
    await db.commit()
    await db.refresh(user)
    return user


async def login(db: AsyncSession, data: LoginRequest) -> tuple[User, str, str]:
    email = data.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise ValueError("Invalid credentials")
    if not user.is_active:
        raise ValueError("Account deactivated")

    access_token = create_access_token(str(user.id), {"role": user.role.value})
    raw_refresh = generate_refresh_token()

    session = RefreshSession(
        user_id=user.id,
        token_hash=hash_refresh_token(raw_refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(session)

    user.last_login_at = datetime.now(timezone.utc)
    log = AuditLog(actor_id=user.id, action="login", resource_type="user", resource_id=str(user.id))
    db.add(log)
    await db.commit()
    await db.refresh(user)
    return user, access_token, raw_refresh


async def refresh_tokens(db: AsyncSession, raw_refresh: str) -> tuple[User, str, str]:
    token_hash = hash_refresh_token(raw_refresh)
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(RefreshSession).where(
            RefreshSession.token_hash == token_hash,
            RefreshSession.revoked_at.is_(None),
            RefreshSession.expires_at > now,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise ValueError("Invalid or expired refresh token")

    user_result = await db.execute(select(User).where(User.id == session.user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise ValueError("User unavailable")

    # Revoke old session
    session.revoked_at = now

    # Issue new tokens
    access_token = create_access_token(str(user.id), {"role": user.role.value})
    new_raw_refresh = generate_refresh_token()
    new_session = RefreshSession(
        user_id=user.id,
        token_hash=hash_refresh_token(new_raw_refresh),
        expires_at=now + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(new_session)
    await db.commit()
    return user, access_token, new_raw_refresh


async def logout(db: AsyncSession, raw_refresh: str) -> None:
    token_hash = hash_refresh_token(raw_refresh)
    result = await db.execute(
        select(RefreshSession).where(RefreshSession.token_hash == token_hash)
    )
    session = result.scalar_one_or_none()
    if session:
        session.revoked_at = datetime.now(timezone.utc)
        await db.commit()


async def admin_create_user(db: AsyncSession, actor: User, full_name: str, email: str, password: str, role: Role) -> User:
    email = email.lower().strip()
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise ValueError("Email already registered")

    user = User(
        full_name=full_name.strip(),
        email=email,
        password_hash=hash_password(password),
        role=role,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.flush()

    log = AuditLog(
        actor_id=actor.id,
        action="admin_create_user",
        resource_type="user",
        resource_id=str(user.id),
        extra_data=json.dumps({"role": role.value, "email": email}),
    )
    db.add(log)
    await db.commit()
    await db.refresh(user)
    return user
