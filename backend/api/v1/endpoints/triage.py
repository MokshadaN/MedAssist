"""Triage endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db
from schemas.triage import TriageOut, TriageRequest
from services.triage_service import detect_urgent_red_flags

router = APIRouter(tags=["triage"])


@router.post("/analyze", response_model=TriageOut)
def analyze(
    req: TriageRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze transcript for medical emergencies and provide hospital information if urgent."""
    return detect_urgent_red_flags(req.transcript, current_user.id, db)