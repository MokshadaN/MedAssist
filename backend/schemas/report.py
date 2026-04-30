"""Pydantic report schemas."""

from pydantic import BaseModel

class ReportOut(BaseModel):
    id: str
    file_url: str

    class Config:
        from_attributes = True