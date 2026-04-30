"""Prescription endpoints."""

from fastapi import APIRouter
from schemas.prescription import PrescriptionCreate, PrescriptionItemCreate

router = APIRouter()

@router.post("/create")
def create_prescription(data: PrescriptionCreate):
    return {"prescription_id": "presc123"}

@router.post("/add-item")
def add_item(data: PrescriptionItemCreate):
    return {"item_id": "item123"}

@router.get("/{visit_id}")
def get_prescription(visit_id: str):
    return {"medicines": []}