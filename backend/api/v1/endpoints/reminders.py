"""Reminder endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_db, require_roles
from schemas.reminder import ReminderCreate, ReminderOut, ReminderUpdate
from services.reminder_service import (
    create_reminder,
    delete_reminder,
    get_reminder,
    get_reminders,
    mark_reminder_completed,
)

router = APIRouter(tags=["reminders"])


@router.post("/me", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
def create_my_reminder(
    data: ReminderCreate,
    current_user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    return create_reminder(db, current_user.id, data.message, data.time)


@router.get("/me", response_model=list[ReminderOut])
def list_my_reminders(
    current_user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    return get_reminders(db, current_user.id)


@router.post("/create", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
def create_reminder_endpoint(data: ReminderCreate, db: Session = Depends(get_db)):
    if not data.user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id is required")
    return create_reminder(db, data.user_id, data.message, data.time)


@router.get("/{user_id}", response_model=list[ReminderOut])
def list_reminders(user_id: str, db: Session = Depends(get_db)):
    return get_reminders(db, user_id)


@router.patch("/{reminder_id}/complete", response_model=ReminderOut)
def complete_reminder(
    reminder_id: str,
    data: ReminderUpdate,
    db: Session = Depends(get_db),
):
    reminder = get_reminder(db, reminder_id)
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
    return mark_reminder_completed(db, reminder, data.is_completed)


@router.delete("/{reminder_id}")
def remove_reminder(reminder_id: str, db: Session = Depends(get_db)):
    reminder = get_reminder(db, reminder_id)
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
    delete_reminder(db, reminder)
    return {"status": "deleted"}

