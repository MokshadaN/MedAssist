"""Message service."""

from models.message import ChatMessage


def create_message(db, session_id: str, message: str, sender: str):
    new_msg = ChatMessage(
        session_id=session_id,
        message=message,
        sender=sender
    )

    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    return new_msg


def get_messages(db, session_id: str):
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.timestamp.asc())
        .all()
    )
