"""Pydantic session schemas."""

from pydantic import BaseModel

class SessionCreate(BaseModel):
    patient_id: str

class SessionOut(BaseModel):
    id: str
    status: str

    class Config:
        from_attributes = True