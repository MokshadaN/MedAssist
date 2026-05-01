"""Doctor endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db, require_roles
from schemas.doctor import DoctorPatientOut, DoctorVisitHistoryOut, DoctorVisitOut
from services.visit_service import get_doctor_patients, get_patient_history, get_visit_details, list_doctors

router = APIRouter(tags=["doctor"])


@router.get("/directory")
def get_doctor_directory(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_doctors(db)


@router.get("/patients", response_model=list[DoctorPatientOut])
def get_patients(
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    return get_doctor_patients(db, current_user.id)


@router.get("/visit/{visit_id}", response_model=DoctorVisitOut)
def get_visit(
    visit_id: str,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    return get_visit_details(db, visit_id, current_user.id)


@router.get("/history/{patient_id}", response_model=list[DoctorVisitHistoryOut])
def get_history(
    patient_id: str,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    return get_patient_history(db, patient_id, current_user.id)
