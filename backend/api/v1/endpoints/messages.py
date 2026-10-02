"""Message endpoints.

P0: requires an authenticated patient who owns the chat session. Doctors never
post messages as the patient; they read sessions through the session routes
under the care-relationship policy.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_db, require_roles
from schemas.message import MessageCreate, MessageOut
from services.access_control import require_session_access
from services.session_service import get_session
from services.message_service import create_message
from services.ai_service import generate_ai_reply

router = APIRouter()


@router.post("/message", response_model=MessageOut, deprecated=True)
def send_message(
    data: MessageCreate,
    current_user=Depends(require_roles("patient")),
    db: Session = Depends(get_db)
):
    session = get_session(db, data.session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # Only the patient who owns the session may send messages into it.
    require_session_access(db, current_user, session)

    # 🔹 1. Save user message
    create_message(
        db,
        session_id=data.session_id,
        message=data.message,
        sender="patient"
    )

    # 🔹 2. Generate AI reply
    ai_reply = generate_ai_reply(data.message)

    # 🔹 3. Save AI reply
    ai_msg = create_message(
        db,
        session_id=data.session_id,
        message=ai_reply,
        sender="ai"
    )

    return ai_msg