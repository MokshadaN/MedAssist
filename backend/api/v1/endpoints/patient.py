"""Patient endpoints.

P0: the public emergency profile is no longer an unauthenticated PHI dump.
It is served only when:
- the patient explicitly enabled it (consent), and
- the request presents the current, unexpired opaque access token, and
- the rate limit is respected.
Every access is audit-logged. Anything else returns 404 (no existence leak).
"""

import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from core.config import settings
from core.dependencies import get_current_user, get_db, require_roles
from core.limiter import limiter
from models.patient import PatientProfile
from schemas.patient import (
    EmergencyAccessOut,
    PatientProfileCreate,
    PatientProfileOut,
    PatientProfilePublic,
    PatientProfileUpdate,
)
from services.audit_service import log_phi_access
from services.patient_service import (
    create_patient_profile,
    get_patient_by_user_id,
    get_public_profile,
    update_patient_profile,
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


# ── Emergency QR profile management (owner only) ─────────────────────────────

@router.post("/profile/emergency-access", response_model=EmergencyAccessOut)
def enable_emergency_access(
    current_user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    """
    Consent to sharing the emergency QR profile. Generates (or rotates) the
    opaque access token; old QR codes stop working after rotation.
    """
    profile = get_patient_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    profile.emergency_profile_enabled = True
    profile.emergency_access_token = secrets.token_urlsafe(32)
    profile.emergency_token_expires_at = datetime.utcnow() + timedelta(
        days=settings.emergency_qr_validity_days
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    log_phi_access(
        db, current_user.id, current_user.role, "patient_public_profile", profile.id,
        "enable", detail="patient enabled emergency QR profile",
    )

    return {
        "enabled": True,
        "access_token": profile.emergency_access_token,
        "expires_at": profile.emergency_token_expires_at,
        "public_path": f"/public-profile/{profile.id}?token={profile.emergency_access_token}",
    }


@router.delete("/profile/emergency-access", response_model=PatientProfileOut)
def disable_emergency_access(
    current_user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    """Withdraw consent: the public profile immediately becomes unreachable."""
    profile = get_patient_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    profile.emergency_profile_enabled = False
    profile.emergency_access_token = None
    profile.emergency_token_expires_at = None
    db.add(profile)
    db.commit()
    db.refresh(profile)

    log_phi_access(
        db, current_user.id, current_user.role, "patient_public_profile", profile.id,
        "disable", detail="patient disabled emergency QR profile",
    )
    return profile


@router.get("/public/{profile_id}", response_model=PatientProfilePublic)
@limiter.limit("10/minute")
def get_public_patient_profile(
    profile_id: str,
    request: Request,
    token: str = "",
    db: Session = Depends(get_db),
):
    """
    Emergency QR profile. Requires patient consent AND the current, unexpired
    opaque access token. Throttled and audit-logged (P0).
    """
    profile = db.query(PatientProfile).filter(PatientProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    if (
        not profile.emergency_profile_enabled
        or not profile.emergency_access_token
        or not token
        or not secrets.compare_digest(token, profile.emergency_access_token)
        or (
            profile.emergency_token_expires_at is not None
            and profile.emergency_token_expires_at < datetime.utcnow()
        )
    ):
        # Same response as a nonexistent profile — do not leak existence.
        raise HTTPException(status_code=404, detail="Patient profile not found")

    public_data = get_public_profile(db, profile_id)
    if not public_data:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    log_phi_access(
        db, "anonymous", "public", "patient_public_profile", profile_id,
        "read", request=request, detail="emergency QR profile access",
    )
    return public_data