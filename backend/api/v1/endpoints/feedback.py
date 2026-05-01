"""Feedback endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from core.dependencies import get_db, require_roles
from schemas.feedback import FeedbackCreate, FeedbackOut
from services.feedback_service import get_feedback, save_feedback

router = APIRouter(tags=["feedback"])


@router.post("/submit", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    data: FeedbackCreate,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    return save_feedback(db, data.visit_id, current_user.id, data.rating, data.comments)


@router.get("/{visit_id}", response_model=FeedbackOut)
def get_feedback_endpoint(
    visit_id: str,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    return get_feedback(db, visit_id, current_user.id)
