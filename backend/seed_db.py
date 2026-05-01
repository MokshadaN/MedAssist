import sys
from pathlib import Path

# Add the current directory to sys.path so we can import modules
sys.path.append(str(Path(__file__).resolve().parent))

from sqlalchemy.orm import Session
from core.database import SessionLocal, Base, engine
from services.auth_service import register_doctor, register_patient
from schemas.auth import DoctorRegister, PatientRegister
from models.visit import Visit
from models.session import ChatSession
from models.reminder import Reminder
from models.prescription import Prescription, PrescriptionItem
from models.user import User
from datetime import datetime, timedelta

def seed():
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    try:
        # 1. Create a Doctor
        dr_data = DoctorRegister(
            name="Dr. Smith",
            email="dr.smith@example.com",
            password="password123",
            phone="1234567890",
            specialization="Cardiology",
            license_number="LIC12345",
            experience_years=10,
            hospital_affiliation="General Hospital"
        )
        try:
            dr_res = register_doctor(db, dr_data)
            doctor_user = dr_res["user"]
            print(f"Created Doctor: {doctor_user.email}")
        except Exception as e:
            print(f"Doctor might already exist: {e}")
            doctor_user = db.query(User).filter(User.email == dr_data.email).first()

        # 2. Create a Patient
        pt_data = PatientRegister(
            name="Jane Doe",
            email="jane.doe@example.com",
            password="password123",
            phone="0987654321",
            age=30,
            gender="Female",
            allergies="Peanuts",
            chronic_conditions="Asthma"
        )
        try:
            pt_res = register_patient(db, pt_data)
            patient_user = pt_res["user"]
            print(f"Created Patient: {patient_user.email}")
        except Exception as e:
            print(f"Patient might already exist: {e}")
            patient_user = db.query(User).filter(User.email == pt_data.email).first()

        # 3. Create a Chat Session
        session = ChatSession(
            patient_id=patient_user.id,
            status="completed"
        )
        db.add(session)
        db.flush()
        print(f"Created Chat Session: {session.id}")

        # 4. Create a Visit
        visit = Visit(
            patient_id=patient_user.id,
            doctor_id=doctor_user.id,
            session_id=session.id,
            status="completed",
            created_at=datetime.utcnow() - timedelta(days=2)
        )
        db.add(visit)
        db.flush()
        print(f"Created Visit: {visit.id}")

        # 5. Create a Reminder
        reminder = Reminder(
            user_id=patient_user.id,
            message="Check blood pressure in the morning",
            time=datetime.utcnow() + timedelta(days=1),
            is_completed=False
        )
        db.add(reminder)
        print("Created Reminder")

        # 6. Create a Prescription
        prescription = Prescription(
            visit_id=visit.id,
            doctor_id=doctor_user.id,
            notes="Take with food."
        )
        db.add(prescription)
        db.flush()
        
        item = PrescriptionItem(
            prescription_id=prescription.id,
            medicine_name="Aspirin",
            dosage="100mg",
            frequency="1-0-0",
            duration="7 days"
        )
        db.add(item)
        print("Created Prescription")

        db.commit()
        print("Seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
