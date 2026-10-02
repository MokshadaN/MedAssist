"""Reminder endpoints.

P0: every route requires authentication and enforces ownership/care
relationships:
- patients see and manage only their own reminders;
- doctors may create/list/complete/delete reminders only for patients with an
  explicit active care relationship.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_db, require_roles
from core.pagination import PageLimit, PageOffset
from schemas.common import DeleteResponse
from schemas.reminder import ReminderCreate, ReminderOut, ReminderUpdate
from services.access_control import require_patient_access, require_reminder_access
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
    return create_reminder(
        db,
        current_user.id,
        data.message,
        data.time,
        idempotency_key=data.idempotency_key,
    )


@router.get("/me", response_model=list[ReminderOut])
def list_my_reminders(
    limit: PageLimit = 50,
    offset: PageOffset = 0,
    current_user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    return get_reminders(db, current_user.id, limit=limit, offset=offset)


@router.post(
    "/create",
    response_model=ReminderOut,
    status_code=status.HTTP_201_CREATED,
    deprecated=True,
)
def create_reminder_endpoint(
    data: ReminderCreate,
    current_user=Depends(require_roles("patient", "doctor")),
    db: Session = Depends(get_db),
):
    """Legacy create route — now authenticated with ownership enforcement."""
    if not data.user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id is required")

    require_patient_access(db, current_user, data.user_id)
    return create_reminder(
        db,
        data.user_id,
        data.message,
        data.time,
        idempotency_key=data.idempotency_key,
    )


@router.get("/{user_id}", response_model=list[ReminderOut], deprecated=True)
def list_reminders(
    user_id: str,
    limit: PageLimit = 50,
    offset: PageOffset = 0,
    current_user=Depends(require_roles("patient", "doctor")),
    db: Session = Depends(get_db),
):
    """Legacy list route — patients only see their own reminders, doctors only
    see reminders of patients they have a care relationship with."""
    require_patient_access(db, current_user, user_id)
    return get_reminders(db, user_id, limit=limit, offset=offset)


@router.patch("/{reminder_id}/complete", response_model=ReminderOut)
def complete_reminder(
    reminder_id: str,
    data: ReminderUpdate,
    current_user=Depends(require_roles("patient", "doctor")),
    db: Session = Depends(get_db),
):
    reminder = get_reminder(db, reminder_id)
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")

    require_reminder_access(db, current_user, reminder)
    return mark_reminder_completed(db, reminder, data.is_completed)


@router.delete("/{reminder_id}", response_model=DeleteResponse)
def remove_reminder(
    reminder_id: str,
    current_user=Depends(require_roles("patient", "doctor")),
    db: Session = Depends(get_db),
):
    reminder = get_reminder(db, reminder_id)
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")

    require_reminder_access(db, current_user, reminder)
    delete_reminder(db, reminder)
    return {"status": "deleted"}