"""Pydantic session schemas."""

from typing import Any, Literal

from pydantic import BaseModel, Field

class SessionCreate(BaseModel):
    patient_id: str

class SessionOut(BaseModel):
    id: str
    status: str
    initial_question: str | None = None

    class Config:
        from_attributes = True


class IntakeAnswerCreate(BaseModel):
    message: str = Field(min_length=1)
    input_mode: Literal["text", "voice"] = "text"
    previous_structured: dict[str, Any] | None = None


class EmergencyHospital(BaseModel):
    name: str
    phone: str | None = None
    address: str | None = None
    distance_meters: float | None = None
    opening_hours: str | None = None
    is_open: bool | None = None


class IntakeResponse(BaseModel):
    session_id: str
    status: str
    message: str
    input_mode: Literal["text", "voice"] | None = None
    next_question: str | None = None
    missing_fields: list[str] = Field(default_factory=list)
    structured_data: dict[str, Any] | None = None
    clinical_summary: str | None = None
    comparison: dict[str, Any] | None = None
    summary_id: str | None = None
    matched_terms: list[str] = Field(default_factory=list)
    nearest_hospitals: list[EmergencyHospital] = Field(default_factory=list)
    emergency_message: str | None = None
