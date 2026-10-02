"""Centralized PHI access policy (P0).

Every ownership / care-relationship decision for patient data MUST go through
this module so the rules cannot drift between endpoints.

Error semantics (consistent, no existence leaks):
- 401: missing/invalid credentials — handled by the auth dependencies.
- 403: the authenticated role may never perform this action.
- 404: the resource does not exist, or exists but is not visible to the caller
       (wrong owner / no care relationship). We deliberately do not distinguish
       so unrelated users cannot probe for other patients' data.
"""

from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from models.doctor import DoctorProfile
from models.medicine_schedule import MedicineSchedule
from models.reminder import Reminder
from models.report import Report
from models.session import ChatSession
from models.visit import Visit


def has_care_relationship(db: Session, doctor_id: str, patient_id: str) -> bool:
    """
    An explicit, active care relationship exists when a visit links this doctor
    to this patient. This is the ONLY way a doctor gets access to patient PHI.
    """
    return (
        db.query(Visit.id)
        .filter(Visit.doctor_id == doctor_id, Visit.patient_id == patient_id)
        .first()
        is not None
    )


def require_patient_access(db: Session, current_user, patient_id: str) -> None:
    """
    The caller may access data belonging to `patient_id`:
    - patients: only their own data;
    - doctors: only patients with an explicit care relationship.
    Anyone else gets a 404 (no existence leak).
    """
    if current_user.role == "patient":
        if current_user.id != patient_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        return

    if current_user.role == "doctor":
        # A care relationship alone is not sufficient: doctors must also have
        # completed the controlled verification workflow before accessing PHI.
        get_verified_doctor_profile_or_403(db, current_user.id)
        if not has_care_relationship(db, current_user.id, patient_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        return

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")


def require_session_access(db: Session, current_user, session: ChatSession) -> None:
    """Owner patient or a doctor with a care relationship with the session's patient."""
    require_patient_access(db, current_user, session.patient_id)


def require_report_access(db: Session, current_user, report: Report) -> None:
    """Owner patient or a doctor with a care relationship with the report's patient."""
    require_patient_access(db, current_user, report.patient_id)


def require_reminder_access(db: Session, current_user, reminder: Reminder) -> None:
    """Owner patient or a doctor with a care relationship with the reminder's owner."""
    require_patient_access(db, current_user, reminder.user_id)


def require_schedule_access(db: Session, current_user, schedule: MedicineSchedule) -> None:
    """Owner patient or a doctor with a care relationship with the schedule's patient."""
    require_patient_access(db, current_user, schedule.patient_id)


def get_verified_doctor_profile_or_403(db: Session, user_id: str) -> DoctorProfile:
    """
    Return the doctor profile only when the doctor is verified through the
    controlled approval workflow. Unverified doctors must not perform
    privileged clinical actions (prescribing, risk checks, visit creation).
    """
    profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == user_id).first()
    if not profile or not profile.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Doctor verification pending. Clinical actions are restricted "
                "until an administrator approves your medical registration."
            ),
        )
    return profile