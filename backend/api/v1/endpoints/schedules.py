"""Medicine schedule endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_db, require_roles
from schemas.schedule import MedicineScheduleOut
from services.schedule_service import deactivate_schedule, get_active_schedules, get_all_schedules

router = APIRouter(tags=["schedules"])


@router.get("/me", response_model=list[MedicineScheduleOut])
def list_my_schedules(
    current_user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    """Patient: list my active medicine schedules."""
    return get_active_schedules(db, current_user.id)


@router.get("/patient/{patient_id}", response_model=list[MedicineScheduleOut])
def list_patient_schedules(
    patient_id: str,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    """Doctor: list all medicine schedules for a patient."""
    return get_all_schedules(db, patient_id)


@router.delete("/{schedule_id}", response_model=MedicineScheduleOut)
def stop_schedule(
    schedule_id: str,
    db: Session = Depends(get_db),
):
    """Deactivate a medicine reminder schedule."""
    schedule = deactivate_schedule(db, schedule_id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    return schedule
