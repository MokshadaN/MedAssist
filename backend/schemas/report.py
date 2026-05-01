"""Pydantic report schemas."""

from pydantic import BaseModel

class ReportOut(BaseModel):
    id: str
    file_url: str
    parsed_data: str | None = None

    class Config:
        from_attributes = True
