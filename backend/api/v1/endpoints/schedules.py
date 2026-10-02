"""Medicine schedule endpoints.

P0: every route requires authentication. Patients manage only their own
schedules; doctors may only view/deactivate schedules of patients with an
explicit active care relationship.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_db, require_roles
from core.pagination import PageLimit, PageOffset
from models.medicine_schedule import MedicineSchedule
from schemas.schedule import MedicineScheduleOut
from services.access_control import require_patient_access, require_schedule_access
from services.schedule_service import deactivate_schedule, get_active_schedules, get_all_schedules

router = APIRouter(tags=["schedules"])


@router.get("/me", response_model=list[MedicineScheduleOut])
def list_my_schedules(
    limit: PageLimit = 50,
    offset: PageOffset = 0,
    current_user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    """Patient: list my active medicine schedules."""
    return get_active_schedules(
        db,
        current_user.id,
        limit=limit,
        offset=offset,
    )


@router.get("/patient/{patient_id}", response_model=list[MedicineScheduleOut])
def list_patient_schedules(
    patient_id: str,
    limit: PageLimit = 50,
    offset: PageOffset = 0,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    """Doctor: list all medicine schedules for a patient they treat."""
    require_patient_access(db, current_user, patient_id)
    return get_all_schedules(db, patient_id, limit=limit, offset=offset)


@router.delete("/{schedule_id}", response_model=MedicineScheduleOut)
def stop_schedule(
    schedule_id: str,
    current_user=Depends(require_roles("patient", "doctor")),
    db: Session = Depends(get_db),
):
    """Deactivate a medicine reminder schedule (owner patient or treating doctor)."""
    schedule = (
        db.query(MedicineSchedule)
        .filter(MedicineSchedule.id == schedule_id)
        .first()
    )
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    require_schedule_access(db, current_user, schedule)
    return deactivate_schedule(db, schedule_id)