"""Pydantic AI schemas."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

class AISummaryOut(BaseModel):
    id: str
    session_id: str
    subjective: str
    objective: str
    assessment: str
    plan: str
    created_at: datetime

    model_config = {"from_attributes": True}


class GenerateSummaryOut(BaseModel):
    status: Literal["urgent", "unavailable", "needs_clarification", "complete"]
    message: str | None = None
    matched_terms: list[str] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    followup_question: str | None = None
    clinical_summary: str | None = None
    structured_data: dict[str, Any] | None = None
