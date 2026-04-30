"""Visit endpoints."""

from fastapi import APIRouter

router = APIRouter()

@router.post("/create")
def create_visit(patient_id: str, doctor_id: str, session_id: str):
    return {"visit_id": "visit123"}

@router.get("/{visit_id}")
def get_visit(visit_id: str):
    return {"visit_id": visit_id}

@router.put("/close")
def close_visit(visit_id: str):
    return {"status": "closed"}