"""AI endpoints."""

from fastapi import APIRouter

router = APIRouter()

@router.post("/generate-summary")
def generate_summary(session_id: str):
    return {
        "subjective": "Headache",
        "objective": "Temp 101",
        "assessment": "Possible flu",
        "plan": "Rest + hydration"
    }

@router.get("/summary/{session_id}")
def get_summary(session_id: str):
    return {"summary": "SOAP data"}