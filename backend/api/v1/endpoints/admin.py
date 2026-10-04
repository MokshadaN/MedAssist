"""Admin endpoints — doctor verification approval workflow (P0).

Verification is granted ONLY here, by an authenticated administrator, after
reviewing the submitted registration evidence. There is no self-service or
format-based verification anywhere else in the system.

Bootstrap the first admin in a controlled environment with:
    python scripts/create_admin.py --email admin@example.com --name Admin
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.dependencies import get_db, require_roles
from core.pagination import PageLimit, PageOffset
from models.doctor import DoctorProfile
from models.user import User
from schemas.doctor import DoctorVerificationResponse
from services.audit_service import log_phi_access

router = APIRouter(tags=["admin"])


class VerificationReview(BaseModel):
    action: str = Field(pattern="^(approve|reject)$")
    note: str | None = Field(default=None, max_length=1000)


class PendingDoctorOut(BaseModel):
    user_id: str
    name: str | None = None
    email: str | None = None
    specialization: str | None = None
    license_number: str | None = None
    state_council: str | None = None
    registration_year: int | None = None
    experience_years: int | None = None
    hospital_affiliation: str | None = None
    verification_status: str = "pending"
    submitted_at: datetime | None = None


def _get_doctor_or_404(db: Session, user_id: str) -> tuple[User, DoctorProfile]:
    user = db.query(User).filter(User.id == user_id, User.role == "doctor").first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")
    return user, profile


@router.get("/doctors/pending", response_model=list[PendingDoctorOut])
def list_pending_doctors(
    limit: PageLimit = 50,
    offset: PageOffset = 0,
    current_user=Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """List doctors awaiting verification review."""
    pending = (
        db.query(DoctorProfile, User)
        .join(User, User.id == DoctorProfile.user_id)
        .filter(DoctorProfile.verification_status == "pending")
        .order_by(DoctorProfile.submitted_at.asc(), DoctorProfile.user_id.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        PendingDoctorOut(
            user_id=user.id,
            name=user.name,
            email=user.email,
            specialization=profile.specialization,
            license_number=profile.license_number,
            state_council=profile.state_council,
            registration_year=profile.registration_year,
            experience_years=profile.experience_years,
            hospital_affiliation=profile.hospital_affiliation,
            verification_status=profile.verification_status,
            submitted_at=profile.submitted_at,
        )
        for profile, user in pending
    ]


@router.post("/doctors/{user_id}/review", response_model=DoctorVerificationResponse)
def review_doctor_verification(
    user_id: str,
    review: VerificationReview,
    current_user=Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """
    Approve or reject a doctor's verification (controlled manual workflow).
    Records reviewer identity, source, timestamp, evidence note, and the
    status transition in the audit log.
    """
    user, profile = _get_doctor_or_404(db, user_id)

    now = datetime.utcnow()
    if review.action == "approve":
        profile.is_verified = True
        profile.verification_status = "approved"
        profile.verified_by = current_user.id
        profile.verified_at = now
        profile.verification_source = "Manual admin review"
        profile.verification_note = review.note
        message = "Doctor verified by administrator review."
    else:
        profile.is_verified = False
        profile.verification_status = "rejected"
        profile.verified_by = current_user.id
        profile.verified_at = now
        profile.verification_source = "Manual admin review"
        profile.verification_note = review.note
        message = "Doctor verification rejected by administrator review."

    db.add(profile)
    db.commit()
    db.refresh(profile)

    log_phi_access(
        db,
        current_user.id,
        current_user.role,
        "doctor_verification",
        user_id,
        "write" if review.action == "approve" else "reject",
        detail=f"verification {profile.verification_status} by admin {current_user.id}"
        + (f": {review.note}" if review.note else ""),
    )

    return {
        "is_verified": bool(profile.is_verified),
        "verification_status": profile.verification_status,
        "registration_number": profile.license_number,
        "state_council": profile.state_council,
        "qualification": profile.qualification,
        "registration_year": profile.registration_year,
        "verification_source": profile.verification_source,
        "status": "Active / Good Standing" if profile.is_verified else "Verification rejected",
        "message": message,
        "verified_at": profile.verified_at,
    }


# ─── Extended Admin Management Endpoints ──────────────────────────────

class AdminDoctorOut(BaseModel):
    user_id: str
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    specialization: str | None = None
    license_number: str | None = None
    state_council: str | None = None
    registration_year: int | None = None
    experience_years: int | None = None
    hospital_affiliation: str | None = None
    is_verified: bool = False
    verification_status: str = "pending"
    verification_note: str | None = None
    created_at: datetime | None = None


class AdminPatientOut(BaseModel):
    user_id: str
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    age: int | None = None
    gender: str | None = None
    address: str | None = None
    allergies: str | None = None
    chronic_conditions: str | None = None
    created_at: datetime | None = None


class AdminStatsOut(BaseModel):
    total_users: int
    total_doctors: int
    verified_doctors: int
    pending_doctors: int
    total_patients: int
    total_visits: int


@router.get("/stats", response_model=AdminStatsOut)
def get_admin_stats(
    current_user=Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Return platform overview stats for the admin dashboard."""
    from models.patient import PatientProfile
    from models.visit import Visit

    total_users = db.query(User).count()
    total_doctors = db.query(User).filter(User.role == "doctor").count()
    verified_doctors = db.query(DoctorProfile).filter(DoctorProfile.is_verified == True).count()
    pending_doctors = db.query(DoctorProfile).filter(DoctorProfile.verification_status == "pending").count()
    total_patients = db.query(User).filter(User.role == "patient").count()
    total_visits = db.query(Visit).count()

    return AdminStatsOut(
        total_users=total_users,
        total_doctors=total_doctors,
        verified_doctors=verified_doctors,
        pending_doctors=pending_doctors,
        total_patients=total_patients,
        total_visits=total_visits,
    )


@router.get("/doctors", response_model=list[AdminDoctorOut])
def list_all_doctors(
    limit: PageLimit = 100,
    offset: PageOffset = 0,
    current_user=Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """List all registered doctors with verification & profile metadata."""
    results = (
        db.query(User, DoctorProfile)
        .outerjoin(DoctorProfile, DoctorProfile.user_id == User.id)
        .filter(User.role == "doctor")
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        AdminDoctorOut(
            user_id=user.id,
            name=user.name,
            email=user.email,
            phone=user.phone,
            specialization=profile.specialization if profile else None,
            license_number=profile.license_number if profile else None,
            state_council=profile.state_council if profile else None,
            registration_year=profile.registration_year if profile else None,
            experience_years=profile.experience_years if profile else None,
            hospital_affiliation=profile.hospital_affiliation if profile else None,
            is_verified=bool(profile.is_verified) if profile else False,
            verification_status=profile.verification_status if profile else "none",
            verification_note=profile.verification_note if profile else None,
            created_at=user.created_at,
        )
        for user, profile in results
    ]


@router.get("/patients", response_model=list[AdminPatientOut])
def list_all_patients(
    limit: PageLimit = 100,
    offset: PageOffset = 0,
    current_user=Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """List all registered patients with medical profiles."""
    from models.patient import PatientProfile

    results = (
        db.query(User, PatientProfile)
        .outerjoin(PatientProfile, PatientProfile.user_id == User.id)
        .filter(User.role == "patient")
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        AdminPatientOut(
            user_id=user.id,
            name=user.name,
            email=user.email,
            phone=user.phone,
            age=profile.age if profile else None,
            gender=profile.gender if profile else None,
            address=profile.address if profile else None,
            allergies=profile.allergies if profile else None,
            chronic_conditions=profile.chronic_conditions if profile else None,
            created_at=user.created_at,
        )
        for user, profile in results
    ]


@router.delete("/doctors/{user_id}")
def delete_doctor(
    user_id: str,
    current_user=Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Delete a doctor user and associated doctor records."""
    from models.visit import Visit
    from models.prescription import Prescription
    from models.triage import TriageRecord

    user = db.query(User).filter(User.id == user_id, User.role == "doctor").first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    # Clean up doctor profile
    db.query(DoctorProfile).filter(DoctorProfile.user_id == user_id).delete()
    # Clean up references in visits/prescriptions
    db.query(Visit).filter(Visit.doctor_id == user_id).delete()
    db.query(Prescription).filter(Prescription.doctor_id == user_id).delete()
    db.query(TriageRecord).filter(TriageRecord.doctor_id == user_id).delete()
    # Delete the user account
    db.delete(user)
    db.commit()

    log_phi_access(
        db,
        current_user.id,
        current_user.role,
        "doctor_management",
        user_id,
        "delete",
        detail=f"Doctor {user.email} deleted by admin {current_user.id}",
    )
    return {"message": f"Doctor {user.email} successfully deleted"}


@router.delete("/patients/{user_id}")
def delete_patient(
    user_id: str,
    current_user=Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Delete a patient user and associated patient records."""
    from models.patient import PatientProfile
    from models.visit import Visit
    from models.prescription import Prescription
    from models.report import Report
    from models.reminder import Reminder
    from models.notification import Notification
    from models.metric import HealthMetric
    from models.session import IntakeSession

    user = db.query(User).filter(User.id == user_id, User.role == "patient").first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    # Clean up patient profile & records
    db.query(PatientProfile).filter(PatientProfile.user_id == user_id).delete()
    db.query(Visit).filter(Visit.patient_id == user_id).delete()
    db.query(Prescription).filter(Prescription.patient_id == user_id).delete()
    db.query(Report).filter(Report.patient_id == user_id).delete()
    db.query(Reminder).filter(Reminder.patient_id == user_id).delete()
    db.query(Notification).filter(Notification.user_id == user_id).delete()
    db.query(HealthMetric).filter(HealthMetric.patient_id == user_id).delete()
    db.query(IntakeSession).filter(IntakeSession.patient_id == user_id).delete()
    # Delete the user account
    db.delete(user)
    db.commit()

    log_phi_access(
        db,
        current_user.id,
        current_user.role,
        "patient_management",
        user_id,
        "delete",
        detail=f"Patient {user.email} deleted by admin {current_user.id}",
    )
    return {"message": f"Patient {user.email} successfully deleted"}