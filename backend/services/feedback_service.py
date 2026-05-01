"""Feedback service."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.feedback import Feedback
from models.visit import Visit


def _get_visit_or_404(db: Session, visit_id: str) -> Visit:
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    return visit


def _get_feedback_or_404(db: Session, visit_id: str) -> Feedback:
    feedback = db.query(Feedback).filter(Feedback.visit_id == visit_id).first()
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
    return feedback


def save_feedback(db: Session, visit_id: str, doctor_id: str, rating: int, comments: str) -> Feedback:
    if rating < 1 or rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5",
        )

    visit = _get_visit_or_404(db, visit_id)
    if visit.doctor_id != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to submit feedback for this visit",
        )

    feedback = db.query(Feedback).filter(Feedback.visit_id == visit_id).first()
    if feedback:
        feedback.ai_accuracy_rating = rating
        feedback.comments = comments.strip()
        feedback.doctor_id = doctor_id
    else:
        feedback = Feedback(
            visit_id=visit_id,
            doctor_id=doctor_id,
            ai_accuracy_rating=rating,
            comments=comments.strip(),
        )
        db.add(feedback)

    db.commit()
    db.refresh(feedback)
    return feedback


def get_feedback(db: Session, visit_id: str, doctor_id: str | None = None) -> Feedback:
    feedback = _get_feedback_or_404(db, visit_id)
    if doctor_id and feedback.doctor_id != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access this feedback",
        )
    return feedback
