"""Pydantic AI schemas."""

from pydantic import BaseModel

class AISummaryOut(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str

    class Config:
        from_attributes = True