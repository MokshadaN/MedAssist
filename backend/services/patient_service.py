"""Patient service."""

from sqlalchemy.orm import Session
from models.patient import PatientProfile
from models.user import User
from schemas.patient import PatientProfileCreate, PatientProfileUpdate


def create_patient_profile(db: Session, profile: PatientProfileCreate, user_id: str) -> PatientProfile:
    """Create a new patient profile."""
    db_profile = PatientProfile(
        user_id=user_id,
        age=profile.age,
        gender=profile.gender,
        allergies=profile.allergies,
        chronic_conditions=profile.chronic_conditions,
        address=profile.address
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile


def get_patient_profile(db: Session, profile_id: str) -> PatientProfile:
    """Get a patient profile by ID."""
    return db.query(PatientProfile).filter(PatientProfile.id == profile_id).first()


def get_patient_by_user_id(db: Session, user_id: str) -> PatientProfile:
    """Get a patient profile by user ID."""
    return db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()


def update_patient_profile(db: Session, user_id: str, profile: PatientProfileUpdate) -> PatientProfile:
    """Update a patient profile."""
    db_profile = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
    if not db_profile:
        return None

    for field, value in profile.model_dump(exclude_unset=True).items():
        setattr(db_profile, field, value)

    db.commit()
    db.refresh(db_profile)
    return db_profile


def get_all_patients(db: Session) -> list[PatientProfile]:
    """Get all patient profiles."""
    return db.query(PatientProfile).all()


def get_public_profile(db: Session, profile_id: str):
    """Get a public summary of a patient profile."""
    result = db.query(
        User.name,
        PatientProfile.age,
        PatientProfile.gender,
        PatientProfile.allergies,
        PatientProfile.chronic_conditions
    ).join(User, User.id == PatientProfile.user_id).filter(PatientProfile.id == profile_id).first()
    
    if not result:
        return None
        
    return {
        "name": result.name,
        "age": result.age,
        "gender": result.gender,
        "allergies": result.allergies,
        "chronic_conditions": result.chronic_conditions
    }