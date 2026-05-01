"""Visit endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from core.dependencies import get_db, require_roles
from schemas.doctor import DoctorVisitOut
from services.visit_service import close_visit, create_patient_visit, create_visit, get_patient_own_history, get_visit

router = APIRouter(tags=["visits"])


@router.get("/my", response_model=list[DoctorVisitOut])
def get_my_visits(
    current_user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    return get_patient_own_history(db, current_user.id)


@router.post("/patient-create", response_model=DoctorVisitOut, status_code=status.HTTP_201_CREATED)
def create_patient_visit_endpoint(
    doctor_id: str,
    session_id: str,
    current_user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    return create_patient_visit(db, current_user.id, doctor_id, session_id)


@router.post("/create", response_model=DoctorVisitOut, status_code=status.HTTP_201_CREATED)
def create_visit_endpoint(
    patient_id: str,
    session_id: str,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    return create_visit(db, patient_id, current_user.id, session_id)


@router.get("/{visit_id}", response_model=DoctorVisitOut)
def get_visit_endpoint(
    visit_id: str,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    return get_visit(db, visit_id, current_user.id)


@router.put("/close", response_model=DoctorVisitOut)
def close_visit_endpoint(
    visit_id: str,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    return close_visit(db, visit_id, current_user.id)
