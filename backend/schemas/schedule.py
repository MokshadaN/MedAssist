"""Pydantic schemas for medicine schedules."""

from datetime import date, datetime
from pydantic import BaseModel


class MedicineScheduleOut(BaseModel):
    id: str
    prescription_item_id: str
    patient_id: str
    patient_phone: str | None = None
    medicine_name: str
    dosage: str | None = None
    frequency: str
    reminder_times: str  # JSON string
    start_date: date
    end_date: date
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
