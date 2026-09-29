"""Pydantic schemas for doctor workflows."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DoctorPatientOut(BaseModel):
    patient_id: str
    patient_name: str
    patient_email: str
    patient_phone: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    visit_count: int
    last_visit_id: Optional[str] = None
    last_visit_status: Optional[str] = None
    last_visit_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DoctorVisitOut(BaseModel):
    visit_id: str
    patient_id: str
    patient_name: str
    patient_email: str
    doctor_id: str
    doctor_name: str
    session_id: Optional[str] = None
    summary_id: Optional[str] = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DoctorVisitHistoryOut(DoctorVisitOut):
    pass


class DoctorVerificationRequest(BaseModel):
    license_number: str
    state_council: Optional[str] = None


class DoctorVerificationResponse(BaseModel):
    is_verified: bool
    registration_number: str
    state_council: Optional[str] = None
    council_code: Optional[str] = None
    qualification: Optional[str] = None
    registration_year: Optional[int] = None
    verification_source: Optional[str] = None
    status: Optional[str] = None
    message: str
    verified_at: Optional[datetime] = None

