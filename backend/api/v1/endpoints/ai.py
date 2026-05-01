"""AI endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.dependencies import get_db
from models.ai_summary import AISummary
from models.session import ChatSession
from schemas.ai import AISummaryOut
from services.ai_service import analyze_patient_transcript

router = APIRouter()


class AIRequest(BaseModel):
    transcript: str


@router.post("/generate-summary")
def generate_summary(req: AIRequest):
    return analyze_patient_transcript(req.transcript)


@router.get("/summary/{session_id}", response_model=AISummaryOut)
def get_summary(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    summary = (
        db.query(AISummary)
        .filter(AISummary.session_id == session_id)
        .order_by(AISummary.created_at.desc())
        .first()
    )
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOAP summary not found for this session",
        )

    return summary
