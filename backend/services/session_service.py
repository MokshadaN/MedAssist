"""Session service."""

from models.session import ChatSession


def create_session(db, patient_id: str):
    new_session = ChatSession(
        patient_id=patient_id,
        status="active"
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return new_session