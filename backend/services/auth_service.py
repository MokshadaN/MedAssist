"""Authentication service."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.doctor import DoctorProfile
from models.patient import PatientProfile
from models.user import User
from schemas.auth import DoctorRegister, PatientRegister
from utils.security import create_access_token, hash_password, verify_password


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _build_user_payload(db: Session, user: User) -> dict:
    payload = {
        "user": user,
        "doctor_profile": None,
        "patient_profile": None,
    }

    if user.role == "doctor":
        payload["doctor_profile"] = (
            db.query(DoctorProfile).filter(DoctorProfile.user_id == user.id).first()
        )
    elif user.role == "patient":
        payload["patient_profile"] = (
            db.query(PatientProfile).filter(PatientProfile.user_id == user.id).first()
        )

    return payload


def _create_user(db: Session, *, name: str, email: str, password: str, role: str, phone: str | None):
    existing_user = db.query(User).filter(User.email == email.strip().lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        name=_normalize_text(name) or name.strip(),
        email=email.strip().lower(),
        password_hash=hash_password(password),
        role=role.strip().lower(),
        phone=_normalize_text(phone),
    )
    db.add(user)
    db.flush()
    return user


def register_doctor(db: Session, doctor_data: DoctorRegister):
    try:
        user = _create_user(
            db,
            name=doctor_data.name,
            email=str(doctor_data.email),
            password=doctor_data.password,
            role="doctor",
            phone=doctor_data.phone,
        )
        profile = DoctorProfile(
            user_id=user.id,
            specialization=_normalize_text(doctor_data.specialization),
            license_number=_normalize_text(doctor_data.license_number),
            experience_years=doctor_data.experience_years,
            hospital_affiliation=_normalize_text(doctor_data.hospital_affiliation),
        )
        db.add(profile)
        db.commit()
        db.refresh(user)
        db.refresh(profile)
        return {"user": user, "doctor_profile": profile}
    except Exception:
        db.rollback()
        raise


def register_patient(db: Session, patient_data: PatientRegister):
    try:
        user = _create_user(
            db,
            name=patient_data.name,
            email=str(patient_data.email),
            password=patient_data.password,
            role="patient",
            phone=patient_data.phone,
        )
        profile = PatientProfile(
            user_id=user.id,
            age=patient_data.age,
            gender=_normalize_text(patient_data.gender),
            allergies=_normalize_text(patient_data.allergies),
            chronic_conditions=_normalize_text(patient_data.chronic_conditions),
        )
        db.add(profile)
        db.commit()
        db.refresh(user)
        db.refresh(profile)
        return {"user": user, "patient_profile": profile}
    except Exception:
        db.rollback()
        raise


def authenticate_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email.strip().lower()).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={
            "sub": user.id,
            "email": user.email,
            "role": user.role,
        }
    )
    return {"access_token": access_token, "token_type": "bearer", **_build_user_payload(db, user)}


def get_current_user(db: Session, user_id: str):
    return db.query(User).filter(User.id == user_id).first()


def get_user_context(db: Session, user: User):
    return _build_user_payload(db, user)
