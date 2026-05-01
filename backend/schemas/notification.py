"""Pydantic notification schemas."""

from datetime import datetime

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: str
    user_id: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class MarkReadResponse(BaseModel):
    status: str
    notification_id: str
