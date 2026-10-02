"""Visit endpoints."""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from core.dependencies import get_db, require_roles, require_verified_doctor
from core.pagination import PageLimit, PageOffset
from schemas.doctor import DoctorVisitOut
from services.visit_service import close_visit, create_patient_visit, create_visit, get_patient_own_history, get_visit
from services.audit_service import log_phi_access

router = APIRouter(tags=["visits"])


@router.get("/my", response_model=list[DoctorVisitOut])
def get_my_visits(
    request: Request,
    limit: PageLimit = 50,
    offset: PageOffset = 0,
    current_user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    log_phi_access(db, current_user.id, current_user.role, "visit", "all", "read", request)
    return get_patient_own_history(
        db,
        current_user.id,
        limit=limit,
        offset=offset,
    )


@router.post("/patient-create", response_model=DoctorVisitOut, status_code=status.HTTP_201_CREATED)
def create_patient_visit_endpoint(
    request: Request,
    doctor_id: str,
    session_id: str,
    current_user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    result = create_patient_visit(db, current_user.id, doctor_id, session_id)
    log_phi_access(db, current_user.id, current_user.role, "visit", result["visit_id"], "write", request)
    return result


@router.post("/create", response_model=DoctorVisitOut, status_code=status.HTTP_201_CREATED)
def create_visit_endpoint(
    request: Request,
    patient_id: str,
    session_id: str,
    current_user=Depends(require_verified_doctor),
    db: Session = Depends(get_db),
):
    result = create_visit(db, patient_id, current_user.id, session_id)
    log_phi_access(db, current_user.id, current_user.role, "visit", result["visit_id"], "write", request,
                   detail=f"doctor created visit for patient {patient_id}")
    return result


@router.get("/{visit_id}", response_model=DoctorVisitOut)
def get_visit_endpoint(
    request: Request,
    visit_id: str,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    result = get_visit(db, visit_id, current_user.id)
    log_phi_access(db, current_user.id, current_user.role, "visit", visit_id, "read", request)
    return result


@router.put("/close", response_model=DoctorVisitOut)
def close_visit_endpoint(
    request: Request,
    visit_id: str,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    result = close_visit(db, visit_id, current_user.id)
    log_phi_access(db, current_user.id, current_user.role, "visit", visit_id, "write", request,
                   detail="visit closed by doctor")
    return result

