"""Pydantic reminder schemas."""

from pydantic import BaseModel

class ReminderCreate(BaseModel):
    user_id: str
    message: str
    time: str