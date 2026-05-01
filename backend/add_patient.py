#!/usr/bin/env python3
"""Script to add patient data for testing."""

import sys
from pathlib import Path

# Add backend directory to path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy.orm import Session
from core.database import SessionLocal, engine
from models.user import User
from models.patient import PatientProfile
from core.database import Base

def add_test_patient():
    """Add a test patient with address in Baner, Pune."""

    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == "patient3@test.com").first()

        if not existing_user:
            # Create user
            user = User(
                role="patient",
                name="Patient Three",
                email="patient3@test.com",
                phone="+91-9876543210"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            user_id = user.id
            print(f"Created user with ID: {user_id}")
        else:
            user_id = existing_user.id
            print(f"Using existing user with ID: {user_id}")

        # Check if patient profile already exists
        existing_profile = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()

        if not existing_profile:
            # Create patient profile
            profile = PatientProfile(
                user_id=user_id,
                age=35,
                gender="Male",
                address="Baner, Pune, Maharashtra, India",
                allergies="None",
                chronic_conditions="Hypertension"
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
            print(f"Created patient profile with ID: {profile.id}")
            print(f"Address: {profile.address}")
        else:
            print(f"Patient profile already exists with ID: {existing_profile.id}")
            print(f"Address: {existing_profile.address}")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_test_patient()