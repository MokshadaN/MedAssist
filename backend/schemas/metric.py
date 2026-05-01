"""Pydantic medical metric schemas."""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MedicalMetricOut(BaseModel):
    id: str
    patient_id: str
    report_id: str
    parameter: str
    value: Optional[float] = None
    raw_value: str
    units: Optional[str] = None
    interpretation: Optional[str] = None
    severity: Optional[str] = None
    measured_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
