"""Pydantic prescription schemas."""

from datetime import datetime

from pydantic import BaseModel


class PrescriptionCreate(BaseModel):
    visit_id: str
    notes: str


class PrescriptionItemCreate(BaseModel):
    medicine_name: str
    dosage: str
    duration: str
    frequency: str


class PrescriptionItemOut(PrescriptionItemCreate):
    id: str
    prescription_id: str


class PrescriptionOut(BaseModel):
    id: str
    visit_id: str
    doctor_id: str
    notes: str | None = None
    created_at: datetime
    items: list[PrescriptionItemOut]
