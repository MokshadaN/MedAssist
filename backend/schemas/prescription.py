"""Pydantic prescription schemas."""

from pydantic import BaseModel


class PrescriptionCreate(BaseModel):
    visit_id: str
    notes: str


class PrescriptionItemCreate(BaseModel):
    medicine_name: str
    dosage: str
    duration: str
    frequency: str
