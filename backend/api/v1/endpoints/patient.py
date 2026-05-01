"""Patient endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db
from schemas.patient import PatientProfileCreate, PatientProfileOut, PatientProfileUpdate
from services.patient_service import (
    create_patient_profile,
    get_patient_profile,
    update_patient_profile,
    get_patient_by_user_id
)

router = APIRouter(tags=["patient"])


@router.post("/profile", response_model=PatientProfileOut)
def create_profile(
    profile: PatientProfileCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a patient profile."""
    return create_patient_profile(db, profile, current_user.id)


@router.get("/profile", response_model=PatientProfileOut)
def get_profile(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's patient profile."""
    profile = get_patient_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return profile


@router.put("/profile", response_model=PatientProfileOut)
def update_profile(
    profile: PatientProfileUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update patient profile."""
    updated_profile = update_patient_profile(db, current_user.id, profile)
    if not updated_profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return updated_profile