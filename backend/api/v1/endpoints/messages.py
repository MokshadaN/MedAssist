"""Message endpoints."""

from fastapi import APIRouter
from schemas.message import MessageCreate

router = APIRouter()

@router.post("/message")
def send_message(msg: MessageCreate):
    return {
        "message_id": "msg_id",
        "reply": "AI response here"
    }