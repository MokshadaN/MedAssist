"""AI endpoints."""

from fastapi import APIRouter

router = APIRouter()

from pydantic import BaseModel
from services.ai_service import analyze_patient_transcript

class AIRequest(BaseModel):
    transcript: str

@router.post("/generate-summary")
def generate_summary(req: AIRequest):
    return analyze_patient_transcript(req.transcript)

@router.get("/summary/{session_id}")
def get_summary(session_id: str):
    return {"summary": "SOAP data"}