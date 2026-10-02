"""Pydantic reminder schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class ReminderCreate(BaseModel):
    user_id: str | None = None
    message: str
    time: datetime
    idempotency_key: str | None = Field(default=None, max_length=255)


class ReminderUpdate(BaseModel):
    is_completed: bool = True


class ReminderOut(BaseModel):
    id: str
    user_id: str
    message: str
    time: datetime
    idempotency_key: str | None = None
    is_completed: bool
    email_24h_status: str
    email_24h_error: str | None = None
    email_1h_status: str
    email_1h_error: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
