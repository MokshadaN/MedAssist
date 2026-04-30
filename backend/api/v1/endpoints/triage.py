"""Triage endpoints."""

from fastapi import APIRouter

router = APIRouter()

@router.post("/analyze")
def analyze(session_id: str):
    return {
        "severity": "medium",
        "recommendation": "Visit doctor if persists"
    }

@router.get("/{session_id}")
def get_triage(session_id: str):
    return {
        "severity": "medium",
        "flags": ["fever"]
    }