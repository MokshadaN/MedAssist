"""Pydantic visit schemas."""

from pydantic import BaseModel

class VisitOut(BaseModel):
    id: str
    status: str

    class Config:
        from_attributes = True