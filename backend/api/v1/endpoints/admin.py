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