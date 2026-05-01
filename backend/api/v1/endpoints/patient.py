"""Patient endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_db
from models.patient import PatientProfile
from models.user import User
from services.prescription_service import get_patient_prescriptions

router = APIRouter(tags=["patient"])


@router.get("/public-profile/{patient_id}")
def get_public_profile(patient_id: str, db: Session = Depends(get_db)):
    """Fetch public patient info for QR scanning."""
    # patient_id is the UUID from PatientProfile
    profile = db.query(PatientProfile).filter(PatientProfile.id == patient_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")

    user = db.query(User).filter(User.id == profile.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Get all prescriptions
    prescriptions = get_patient_prescriptions(db, user.id)
    
    # Flatten medications for easier display
    medications = []
    for p in prescriptions:
        for item in p.get("items", []):
            medications.append({
                "medicine_name": item["medicine_name"],
                "dosage": item["dosage"],
                "duration": item["duration"],
                "frequency": item["frequency"],
                "prescribed_on": p["created_at"]
            })

    return {
        "name": user.name,
        "age": profile.age,
        "gender": profile.gender,
        "allergies": profile.allergies,
        "chronic_conditions": profile.chronic_conditions,
        "medications": medications
    }
