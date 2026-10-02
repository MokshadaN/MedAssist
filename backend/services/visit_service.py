"""Visit service for visit and doctor workflows."""

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core.domain_errors import ResourceConflict
from models.ai_summary import AISummary
from models.session import ChatSession
from models.patient import PatientProfile
from models.doctor import DoctorProfile
from models.user import User
from models.visit import Visit


def _visit_detail_payload(visit: Visit, patient: User, doctor: User) -> dict:
    return {
        "visit_id": visit.id,
        "patient_id": patient.id,
        "patient_name": patient.name,
        "patient_email": patient.email,
        "doctor_id": doctor.id,
        "doctor_name": doctor.name,
        "session_id": visit.session_id,
        "summary_id": visit.summary_id,
        "status": visit.status,
        "created_at": visit.created_at,
    }


def _get_visit_or_404(db: Session, visit_id: str) -> Visit:
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    return visit


def _get_user_or_404(db: Session, user_id: str, role: str | None = None) -> User:
    query = db.query(User).filter(User.id == user_id)
    if role:
        query = query.filter(User.role == role)
    user = query.first()
    if not user:
        label = role.capitalize() if role else "User"
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{label} not found")
    return user


def _serialize_visit(db: Session, visit: Visit) -> dict:
    patient = _get_user_or_404(db, visit.patient_id, "patient")
    doctor = _get_user_or_404(db, visit.doctor_id, "doctor")
    return _visit_detail_payload(visit, patient, doctor)


def _existing_visit_for_session(
    db: Session,
    session_id: str,
    patient_id: str,
    doctor_id: str,
) -> Visit | None:
    existing = db.query(Visit).filter(Visit.session_id == session_id).first()
    if not existing:
        return None
    if existing.patient_id != patient_id or existing.doctor_id != doctor_id:
        raise ResourceConflict("Intake session is already assigned to another visit")
    return existing


def _create_visit_once(
    db: Session,
    *,
    patient_id: str,
    doctor_id: str,
    session_id: str,
    summary_id: str | None = None,
) -> Visit:
    existing = _existing_visit_for_session(
        db,
        session_id,
        patient_id,
        doctor_id,
    )
    if existing:
        return existing

    visit = Visit(
        patient_id=patient_id,
        doctor_id=doctor_id,
        session_id=session_id,
        summary_id=summary_id,
        status="pending",
    )
    db.add(visit)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = _existing_visit_for_session(
            db,
            session_id,
            patient_id,
            doctor_id,
        )
        if existing:
            return existing
        raise
    db.refresh(visit)
    return visit


def _patient_payload(patient: User, profile: PatientProfile | None, visit: Visit, visit_count: int) -> dict:
    return {
        "patient_id": patient.id,
        "patient_name": patient.name,
        "patient_email": patient.email,
        "patient_phone": patient.phone,
        "age": profile.age if profile else None,
        "gender": profile.gender if profile else None,
        "visit_count": visit_count,
        "last_visit_id": visit.id,
        "last_visit_status": visit.status,
        "last_visit_at": visit.created_at,
    }


def create_visit(db: Session, patient_id: str, doctor_id: str, session_id: str):
    _get_user_or_404(db, patient_id, "patient")
    _get_user_or_404(db, doctor_id, "doctor")
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")
    if session.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to use this session",
        )

    visit = _create_visit_once(
        db,
        patient_id=patient_id,
        doctor_id=doctor_id,
        session_id=session_id,
    )
    return _serialize_visit(db, visit)


def list_doctors(db: Session, *, limit: int = 50, offset: int = 0):
    doctor_rows = (
        db.query(User, DoctorProfile)
        .join(DoctorProfile, DoctorProfile.user_id == User.id)
        .filter(
            User.role == "doctor",
            DoctorProfile.is_verified.is_(True),
            DoctorProfile.verification_status == "approved",
        )
        .order_by(User.name.asc(), User.id.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    result = []
    for doctor, profile in doctor_rows:
        result.append({
            "id": doctor.id,
            "name": doctor.name,
            "email": doctor.email,
            "phone": doctor.phone,
            "specialization": profile.specialization,
            "license_number": profile.license_number,
            "is_verified": profile.is_verified,
            "state_council": profile.state_council,
            "qualification": profile.qualification,
            "experience_years": profile.experience_years,
            "hospital_affiliation": profile.hospital_affiliation,
        })
    return result


def create_patient_visit(db: Session, patient_id: str, doctor_id: str, session_id: str):
    _get_user_or_404(db, patient_id, "patient")
    _get_user_or_404(db, doctor_id, "doctor")

    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")
    if session.patient_id != patient_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to use this session")

    summary = (
        db.query(AISummary)
        .filter(AISummary.session_id == session_id)
        .order_by(AISummary.created_at.desc())
        .first()
    )

    visit = _create_visit_once(
        db,
        patient_id=patient_id,
        doctor_id=doctor_id,
        session_id=session_id,
        summary_id=summary.id if summary else None,
    )
    return _serialize_visit(db, visit)


def get_visit(db: Session, visit_id: str, doctor_id: str | None = None):
    visit = _get_visit_or_404(db, visit_id)
    if doctor_id and visit.doctor_id != doctor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this visit")
    return _serialize_visit(db, visit)


def close_visit(db: Session, visit_id: str, doctor_id: str | None = None):
    visit = _get_visit_or_404(db, visit_id)
    if doctor_id and visit.doctor_id != doctor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this visit")
    visit.status = "closed"
    db.commit()
    db.refresh(visit)
    return _serialize_visit(db, visit)


def get_doctor_patients(
    db: Session,
    doctor_id: str,
    *,
    limit: int = 50,
    offset: int = 0,
):
    patient_rows = (
        db.query(
            Visit.patient_id,
            func.max(Visit.created_at).label("last_visit_at"),
        )
        .filter(Visit.doctor_id == doctor_id)
        .group_by(Visit.patient_id)
        .order_by(func.max(Visit.created_at).desc(), Visit.patient_id.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    patients: list[dict] = []
    for patient_id, _last_visit_at in patient_rows:
        patient = db.query(User).filter(User.id == patient_id).first()
        if not patient:
            continue

        profile = db.query(PatientProfile).filter(PatientProfile.user_id == patient.id).first()
        visit_count = db.query(Visit).filter(Visit.doctor_id == doctor_id, Visit.patient_id == patient.id).count()
        visit = (
            db.query(Visit)
            .filter(Visit.doctor_id == doctor_id, Visit.patient_id == patient.id)
            .order_by(Visit.created_at.desc(), Visit.id.desc())
            .first()
        )
        if not visit:
            continue
        patients.append(_patient_payload(patient, profile, visit, visit_count))

    return patients


def get_visit_details(db: Session, visit_id: str, doctor_id: str | None = None):
    visit = _get_visit_or_404(db, visit_id)

    if doctor_id and visit.doctor_id != doctor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this visit")

    return _serialize_visit(db, visit)


def get_patient_history(
    db: Session,
    patient_id: str,
    doctor_id: str | None = None,
    *,
    limit: int = 50,
    offset: int = 0,
):
    patient = db.query(User).filter(User.id == patient_id, User.role == "patient").first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    query = db.query(Visit).filter(Visit.patient_id == patient_id)
    if doctor_id:
        query = query.filter(Visit.doctor_id == doctor_id)

    visits = (
        query.order_by(Visit.created_at.desc(), Visit.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    if not visits:
        return []

    history: list[dict] = []
    for visit in visits:
        doctor = db.query(User).filter(User.id == visit.doctor_id).first()
        if not doctor:
            continue
        history.append(_visit_detail_payload(visit, patient, doctor))

    return history


def get_patient_own_history(
    db: Session,
    patient_id: str,
    *,
    limit: int = 50,
    offset: int = 0,
):
    return get_patient_history(db, patient_id, limit=limit, offset=offset)
