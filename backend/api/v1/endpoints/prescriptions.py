"""Prescription endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from core.dependencies import get_db, require_roles, require_verified_doctor
from core.pagination import PageLimit, PageOffset
from schemas.prescription import (
    PrescriptionCreate,
    PrescriptionItemCreate,
    PrescriptionItemOut,
    PrescriptionOut,
)
from services.prescription_service import add_item as add_item_service
from services.prescription_service import create_prescription as create_prescription_service
from services.prescription_service import get_patient_prescriptions
from services.prescription_service import get_prescription_by_visit

router = APIRouter(tags=["prescriptions"])


@router.post(
    "/create",
    response_model=PrescriptionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_prescription(
    data: PrescriptionCreate,
    current_user=Depends(require_verified_doctor),
    db: Session = Depends(get_db),
):
    return create_prescription_service(db, data.visit_id, data.notes, current_user.id)


@router.post("/add-item", response_model=PrescriptionItemOut)
def add_item(
    prescription_id: str,
    data: PrescriptionItemCreate,
    current_user=Depends(require_verified_doctor),
    db: Session = Depends(get_db),
):
    return add_item_service(
        db,
        prescription_id,
        data.medicine_name,
        data.dosage,
        data.duration,
        data.frequency,
        current_user.id,
    )


@router.get("/my", response_model=list[PrescriptionOut])
def get_my_prescriptions(
    limit: PageLimit = 50,
    offset: PageOffset = 0,
    current_user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    return get_patient_prescriptions(
        db,
        current_user.id,
        limit=limit,
        offset=offset,
    )


@router.get("/{visit_id}", response_model=PrescriptionOut)
def get_prescription(
    visit_id: str,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    return get_prescription_by_visit(db, visit_id, current_user.id)
