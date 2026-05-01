"""Triage endpoints."""

from fastapi import APIRouter

router = APIRouter()

from pydantic import BaseModel
from services.triage_service import detect_urgent_red_flags

class TriageRequest(BaseModel):
    transcript: str

@router.post("/analyze")
def analyze(req: TriageRequest):
    return detect_urgent_red_flags(req.transcript)

@router.get("/{session_id}")
def get_triage(session_id: str):
    return {
        "severity": "medium",
        "flags": ["fever"]
    }