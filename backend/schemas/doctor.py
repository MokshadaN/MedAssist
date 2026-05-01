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
