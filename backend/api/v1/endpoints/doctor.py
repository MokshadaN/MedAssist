"""Doctor endpoints."""

from fastapi import APIRouter

router = APIRouter()

@router.get("/patients")
def get_patients():
    return [{"patient_id": "p1"}, {"patient_id": "p2"}]

@router.get("/visit/{visit_id}")
def get_visit(visit_id: str):
    return {"visit_id": visit_id, "details": {}}

@router.get("/history/{patient_id}")
def get_history(patient_id: str):
    return [{"visit_id": "v1"}, {"visit_id": "v2"}]