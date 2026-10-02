"""Pydantic report schemas."""

from datetime import datetime

from pydantic import BaseModel

class ReportOut(BaseModel):
    id: str
    file_url: str
    parsed_data: str | None = None
    analysis_status: str = "uploaded"  # uploaded | queued | processing | completed | failed
    analysis_status_updated_at: datetime | None = None
    analysis_error: str | None = None

    model_config = {"from_attributes": True}
