import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.user import NotificationType


class NotificationOut(BaseModel):
    id: uuid.UUID
    title: str
    message: str
    notification_type: NotificationType
    is_read: bool
    created_at: datetime
    read_at: datetime | None
    related_entity_id: str | None
    related_entity_type: str | None

    model_config = {"from_attributes": True}


class UnreadCountOut(BaseModel):
    unread_count: int


class MarkAllReadOut(BaseModel):
    marked_count: int
