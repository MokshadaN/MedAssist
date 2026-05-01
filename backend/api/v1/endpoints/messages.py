"""Message endpoints."""

"""Message endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_db
from schemas.message import MessageCreate, MessageOut

from services.message_service import create_message
from services.ai_service import generate_ai_reply

router = APIRouter()


@router.post("/message", response_model=MessageOut)
def send_message(
    data: MessageCreate,
    db: Session = Depends(get_db)
):
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