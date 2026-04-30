"""Session endpoints."""

from fastapi import APIRouter
from schemas.session import SessionCreate, SessionOut

router = APIRouter()

@router.post("/start", response_model=SessionOut)
def start_chat(data: SessionCreate):
    return {"id": "session_id", "status": "active"}

@router.get("/{session_id}")
def get_chat(session_id: str):
    return {"session_id": session_id, "messages": []}