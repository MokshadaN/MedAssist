import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db, require_roles
from fastapi_cache.decorator import cache
from models.doctor import DoctorProfile
from schemas.doctor import (
    DoctorPatientOut,
    DoctorVisitHistoryOut,
    DoctorVisitOut,
    DoctorVerificationRequest,
    DoctorVerificationResponse,
)
from services.doctor_verification_service import parse_and_validate_indian_registration
from services.visit_service import get_doctor_patients, get_patient_history, get_visit_details, list_doctors

router = APIRouter(tags=["doctor"])


@router.get("/directory")
@cache(expire=60)  # Short cache for directory updates
def get_doctor_directory(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_doctors(db)


@router.post("/verify-license", response_model=DoctorVerificationResponse)
def verify_doctor_license(
    req: DoctorVerificationRequest,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    """
    Verify doctor's registration against Indian Medical Council (NMC/State Councils).
    Updates doctor profile in the database upon successful verification.
    """
    result = parse_and_validate_indian_registration(req.license_number, req.state_council)
    
    if not result.get("is_verified"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("reason", "License verification failed."),
        )

    # Update doctor profile
    doctor_profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    if not doctor_profile:
        doctor_profile = DoctorProfile(user_id=current_user.id)
        db.add(doctor_profile)

    now = datetime.datetime.utcnow()
    doctor_profile.license_number = result["registration_number"]
    doctor_profile.is_verified = True
    doctor_profile.state_council = result["state_council"]
    doctor_profile.qualification = result.get("qualification")
    doctor_profile.registration_year = result.get("registration_year")
    doctor_profile.verification_source = result.get("verification_source")
    doctor_profile.verified_at = now
    
    db.commit()
    db.refresh(doctor_profile)

    return {
        "is_verified": True,
        "registration_number": doctor_profile.license_number,
        "state_council": doctor_profile.state_council,
        "council_code": result.get("council_code"),
        "qualification": doctor_profile.qualification,
        "registration_year": doctor_profile.registration_year,
        "verification_source": doctor_profile.verification_source,
        "status": result.get("status"),
        "message": result["message"],
        "verified_at": doctor_profile.verified_at,
    }


@router.get("/verification-status", response_model=DoctorVerificationResponse)
def get_verification_status(
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    """Get the current doctor's verification status."""
    doctor_profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    if not doctor_profile or not doctor_profile.license_number:
        return {
            "is_verified": False,
            "registration_number": "",
            "message": "No medical registration submitted yet.",
        }

    return {
        "is_verified": bool(doctor_profile.is_verified),
        "registration_number": doctor_profile.license_number,
        "state_council": doctor_profile.state_council,
        "qualification": doctor_profile.qualification,
        "registration_year": doctor_profile.registration_year,
        "verification_source": doctor_profile.verification_source,
        "status": "Active / Good Standing" if doctor_profile.is_verified else "Pending Verification",
        "message": "Medical registration verified with NMC/State Council." if doctor_profile.is_verified else "Pending verification.",
        "verified_at": doctor_profile.verified_at,
    }


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

