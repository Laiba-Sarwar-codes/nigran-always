"""Notification service: create, list, mark-read, delete."""
import uuid
from datetime import datetime
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import Notification, NotificationType, User, AuditLog


async def create_notification(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    message: str,
    notification_type: NotificationType = NotificationType.GENERAL,
    related_entity_id: str | None = None,
    related_entity_type: str | None = None,
) -> Notification:
    n = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        related_entity_id=related_entity_id,
        related_entity_type=related_entity_type,
    )
    db.add(n)
    await db.flush()
    return n


async def get_notifications(db: AsyncSession, user: User, limit: int = 50, offset: int = 0) -> list[Notification]:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


async def get_unread_count(db: AsyncSession, user: User) -> int:
    result = await db.execute(
        select(func.count(Notification.id))
        .where(Notification.user_id == user.id, Notification.is_read.is_(False))
    )
    return result.scalar_one()


async def mark_read(db: AsyncSession, user: User, notification_id: uuid.UUID) -> Notification:
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == user.id)
    )
    n = result.scalar_one_or_none()
    if not n:
        raise ValueError("Notification not found")
    if not n.is_read:
        n.is_read = True
        n.read_at = datetime.utcnow()
    await db.commit()
    return n


async def mark_all_read(db: AsyncSession, user: User) -> int:
    result = await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        .values(is_read=True, read_at=datetime.utcnow())
    )
    await db.commit()
    return result.rowcount


async def delete_notification(db: AsyncSession, user: User, notification_id: uuid.UUID) -> None:
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == user.id)
    )
    n = result.scalar_one_or_none()
    if not n:
        raise ValueError("Notification not found")
    await db.delete(n)
    await db.commit()


# ── Convenience audit helper ───────────────────────────────────────────────────

async def audit(
    db: AsyncSession,
    actor_id: uuid.UUID | None,
    action: str,
    resource_type: str | None = None,
    resource_id: str | None = None,
    extra_data: str | None = None,
) -> None:
    db.add(AuditLog(
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        extra_data=extra_data,
    ))
    await db.flush()
