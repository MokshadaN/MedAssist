"""Session endpoints.

P0: every route requires authentication. The patient identity is derived from
the authenticated user — the request body's patient_id is only cross-checked,
never trusted. Doctors may read a session only when an explicit care
relationship with the session's patient exists (see services/access_control).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_db, require_roles
from schemas.session import (
    IntakeAnswerCreate,
    IntakeResponse,
    SessionCreate,
    SessionDetailOut,
    SessionOut,
)
from services.access_control import require_session_access
from services.message_service import get_messages
from services.session_service import get_session, process_intake_answer, start_intake_session

router = APIRouter()


@router.post("/start", response_model=SessionOut)
def start_chat(
    data: SessionCreate,
    current_user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    # The session is always bound to the authenticated patient.
    if data.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sessions can only be started for the authenticated patient",
        )
    session, first_question = start_intake_session(db, current_user.id)
    return {
        "id": session.id,
        "status": session.status,
        "initial_question": first_question,
    }


@router.post("/{session_id}/intake", response_model=IntakeResponse)
def answer_intake_question(
    session_id: str,
    data: IntakeAnswerCreate,
    current_user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    session = get_session(db, session_id)

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # Intake answers can only be written by the patient who owns the session.
    require_session_access(db, current_user, session)

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


@router.get("/{session_id}", response_model=SessionDetailOut)
def get_chat(
    session_id: str,
    current_user=Depends(require_roles("patient", "doctor")),
    db: Session = Depends(get_db),
):
    session = get_session(db, session_id)

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # Owner patient, or a doctor with an active care relationship.
    require_session_access(db, current_user, session)

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