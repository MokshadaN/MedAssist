from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db, require_roles, require_verified_doctor
from core.pagination import PageLimit, PageOffset
from fastapi_cache.decorator import cache
from models.doctor import DoctorProfile
from schemas.doctor import (
    DoctorDirectoryOut,
    DoctorPatientOut,
    DoctorVisitHistoryOut,
    DoctorVisitOut,
    DoctorVerificationRequest,
    DoctorVerificationResponse,
)
from services.doctor_verification_service import (
    reset_verification_for_review,
    validate_registration_format,
)
from services.access_control import require_patient_access
from services.visit_service import get_doctor_patients, get_patient_history, get_visit_details, list_doctors

router = APIRouter(tags=["doctor"])


@router.get("/directory", response_model=list[DoctorDirectoryOut])
@cache(expire=60)  # Short cache for directory updates
def get_doctor_directory(
    limit: PageLimit = 50,
    offset: PageOffset = 0,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_doctors(db, limit=limit, offset=offset)


@router.post("/verify-license", response_model=DoctorVerificationResponse)
def verify_doctor_license(
    req: DoctorVerificationRequest,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    """
    Submit (or re-submit) the doctor's medical registration for review (P0).

    This endpoint only validates the registration-number FORMAT and records
    the submission. It NEVER sets is_verified — verification is granted solely
    by an administrator through the controlled approval workflow.
    """
    result = validate_registration_format(req.license_number, req.state_council)

    if not result.get("is_valid_format"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("reason", "Invalid medical registration number format."),
        )

    doctor_profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    if not doctor_profile:
        doctor_profile = DoctorProfile(user_id=current_user.id)
        db.add(doctor_profile)

    previous_license = doctor_profile.license_number
    same_license = previous_license == result["registration_number"]

    doctor_profile.license_number = result["registration_number"]
    doctor_profile.state_council = result.get("state_council")
    doctor_profile.registration_year = result.get("registration_year")

    if same_license and doctor_profile.is_verified:
        # Re-submission of the already-approved registration: nothing changes.
        pass
    else:
        # New or changed registration: reset verification, queue for review.
        reset_verification_for_review(doctor_profile)

    db.commit()
    db.refresh(doctor_profile)

    return {
        "is_verified": bool(doctor_profile.is_verified),
        "verification_status": doctor_profile.verification_status,
        "registration_number": doctor_profile.license_number,
        "state_council": doctor_profile.state_council,
        "council_code": result.get("council_code"),
        "qualification": doctor_profile.qualification,
        "registration_year": doctor_profile.registration_year,
        "verification_source": doctor_profile.verification_source,
        "status": (
            "Active / Good Standing" if doctor_profile.is_verified
            else "Pending administrator review"
        ),
        "message": (
            "Registration already verified with the administrator."
            if doctor_profile.is_verified
            else "Registration number accepted and submitted for administrator review. "
                 "Verification is required before clinical actions are unlocked."
        ),
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
        "verification_status": doctor_profile.verification_status,
        "registration_number": doctor_profile.license_number,
        "state_council": doctor_profile.state_council,
        "qualification": doctor_profile.qualification,
        "registration_year": doctor_profile.registration_year,
        "verification_source": doctor_profile.verification_source,
        "status": "Active / Good Standing" if doctor_profile.is_verified else "Pending Verification",
        "message": "Medical registration verified by administrator review." if doctor_profile.is_verified else "Pending administrator review.",
        "verified_at": doctor_profile.verified_at,
    }


@router.get("/patients", response_model=list[DoctorPatientOut])
def get_patients(
    limit: PageLimit = 50,
    offset: PageOffset = 0,
    current_user=Depends(require_verified_doctor),
    db: Session = Depends(get_db),
):
    return get_doctor_patients(db, current_user.id, limit=limit, offset=offset)


@router.get("/visit/{visit_id}", response_model=DoctorVisitOut)
def get_visit(
    visit_id: str,
    current_user=Depends(require_verified_doctor),
    db: Session = Depends(get_db),
):
    return get_visit_details(db, visit_id, current_user.id)


@router.get("/history/{patient_id}", response_model=list[DoctorVisitHistoryOut])
def get_history(
    patient_id: str,
    limit: PageLimit = 50,
    offset: PageOffset = 0,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    require_patient_access(db, current_user, patient_id)
    return get_patient_history(
        db,
        patient_id,
        current_user.id,
        limit=limit,
        offset=offset,
    )

