"""Pydantic AI schemas."""

from datetime import datetime

from pydantic import BaseModel

class AISummaryOut(BaseModel):
    id: str
    session_id: str
    subjective: str
    objective: str
    assessment: str
    plan: str
    created_at: datetime

    class Config:
        from_attributes = True
