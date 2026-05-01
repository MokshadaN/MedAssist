"""Session endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_db
from schemas.session import IntakeAnswerCreate, IntakeResponse, SessionCreate, SessionOut
from services.message_service import get_messages
from services.session_service import get_session, process_intake_answer, start_intake_session

router = APIRouter()


@router.post("/start", response_model=SessionOut)
def start_chat(
    data: SessionCreate,
    db: Session = Depends(get_db),
):
    session, first_question = start_intake_session(db, data.patient_id)
    return {
        "id": session.id,
        "status": session.status,
        "initial_question": first_question,
    }


@router.post("/{session_id}/intake", response_model=IntakeResponse)
def answer_intake_question(
    session_id: str,
    data: IntakeAnswerCreate,
    db: Session = Depends(get_db),
):
    session = get_session(db, session_id)

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if session.status in {"complete", "urgent"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Session is already {session.status}",
        )

    return process_intake_answer(
        db=db,
        session=session,
        message=data.message,
        input_mode=data.input_mode,
        previous_structured=data.previous_structured,
    )


@router.get("/{session_id}")
def get_chat(
    session_id: str,
    db: Session = Depends(get_db),
):
    session = get_session(db, session_id)

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    messages = get_messages(db, session_id)

    return {
        "session_id": session_id,
        "status": session.status,
        "messages": [
            {
                "id": msg.id,
                "sender": msg.sender,
                "message": msg.message,
                "timestamp": msg.timestamp,
            }
            for msg in messages
        ],
    }
