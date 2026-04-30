"""Pydantic message schemas."""

from pydantic import BaseModel

class MessageCreate(BaseModel):
    session_id: str
    message: str

class MessageOut(BaseModel):
    id: str
    message: str
    sender: str

    class Config:
        from_attributes = True