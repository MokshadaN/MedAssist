"""Session endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from schemas.session import SessionCreate, SessionOut
from services.session_service import create_session
from core.dependencies import get_db

router = APIRouter()


# 🔹 START CHAT
@router.post("/start", response_model=SessionOut)
def start_chat(
    data: SessionCreate,
    db: Session = Depends(get_db)
):
    session = create_session(db, data.patient_id)
    return session


# 🔹 GET CHAT (we'll improve later)
@router.get("/{session_id}")
def get_chat(
    session_id: str,
    db: Session = Depends(get_db)
):
    # placeholder for now
    return {
        "session_id": session_id,
        "messages": []
    }