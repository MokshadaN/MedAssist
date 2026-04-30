"""Session endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from schemas.session import SessionCreate, SessionOut
from services.session_service import create_session
from core.dependencies import get_db
from models.session import ChatSession
from services.message_service import get_messages

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
    # 🔹 Check session exists
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 🔹 Fetch messages
    messages = get_messages(db, session_id)

    return {
    "session_id": session_id,
    "messages": [
        {
            "id": msg.id,
            "sender": msg.sender,
            "message": msg.message,
            "timestamp": msg.timestamp
        }
        for msg in messages
    ]
}