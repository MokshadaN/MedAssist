"""Patient service."""

from sqlalchemy.orm import Session
from models.patient import PatientProfile
from models.user import User
from models.visit import Visit
from models.prescription import Prescription, PrescriptionItem
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
    # Get profile and user info
    profile_data = db.query(
        User.id.label("user_id"),
        User.name,
        PatientProfile.age,
        PatientProfile.gender,
        PatientProfile.allergies,
        PatientProfile.chronic_conditions
    ).join(User, User.id == PatientProfile.user_id).filter(PatientProfile.id == profile_id).first()
    
    if not profile_data:
        return None
        
    # Get active medications (items from all prescriptions for this patient)
    medications = db.query(
        PrescriptionItem.medicine_name,
        PrescriptionItem.dosage,
        PrescriptionItem.duration,
        PrescriptionItem.frequency,
        Prescription.created_at.label("prescribed_on")
    ).join(Prescription, Prescription.id == PrescriptionItem.prescription_id)\
     .join(Visit, Visit.id == Prescription.visit_id)\
     .filter(Visit.patient_id == profile_data.user_id)\
     .order_by(Prescription.created_at.desc()).all()

    return {
        "name": profile_data.name,
        "age": profile_data.age,
        "gender": profile_data.gender,
        "allergies": profile_data.allergies,
        "chronic_conditions": profile_data.chronic_conditions,
        "medications": [
            {
                "medicine_name": m.medicine_name,
                "dosage": m.dosage,
                "duration": m.duration,
                "frequency": m.frequency,
                "prescribed_on": m.prescribed_on.isoformat() if m.prescribed_on else ""
            } for m in medications
        ]
    }