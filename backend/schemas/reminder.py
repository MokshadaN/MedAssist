"""Pydantic reminder schemas."""

from datetime import datetime

from pydantic import BaseModel


class ReminderCreate(BaseModel):
    user_id: str
    message: str

    time: datetime


class ReminderUpdate(BaseModel):
    is_completed: bool = True


class ReminderOut(BaseModel):
    id: str
    user_id: str
    message: str
    time: datetime
    is_completed: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
