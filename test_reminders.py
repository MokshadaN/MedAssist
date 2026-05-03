import os
import sys
from datetime import datetime

# Setup path
backend_dir = os.path.join(os.path.dirname(__file__), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from core.database import SessionLocal, engine, Base
from models.user import User
from models.visit import Visit
from models.prescription import Prescription, PrescriptionItem
from services.prescription_service import add_item
from services.reminder_service import create_reminder
from services.schedule_service import get_active_schedules

def run_test():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Create a dummy user
        user = db.query(User).filter(User.email == "test_patient@example.com").first()
        if not user:
            user = User(name="Test Patient", email="test_patient@example.com", phone="+919876543210", role="patient")
            db.add(user)
            db.commit()
            db.refresh(user)
            
        doctor = db.query(User).filter(User.email == "test_doctor@example.com").first()
        if not doctor:
            doctor = User(name="Test Doctor", email="test_doctor@example.com", phone="+919876543211", role="doctor")
            db.add(doctor)
            db.commit()
            db.refresh(doctor)
            
        # Create a visit
        visit = db.query(Visit).filter(Visit.patient_id == user.id).first()
        if not visit:
            visit = Visit(patient_id=user.id, doctor_id=doctor.id)
            db.add(visit)
            db.commit()
            db.refresh(visit)
            
        # Create a prescription
        prescription = db.query(Prescription).filter(Prescription.visit_id == visit.id).first()
        if not prescription:
            prescription = Prescription(visit_id=visit.id, doctor_id=doctor.id, notes="Test notes")
            db.add(prescription)
            db.commit()
            db.refresh(prescription)
            
        # 1. Test WhatsApp scheduling via add_item
        print("Testing WhatsApp Schedule Creation...")
        item = add_item(
            db=db,
            prescription_id=prescription.id,
            medicine_name="Testamol 500mg",
            dosage="1 tablet",
            duration="3 days",
            frequency="3 times/day",
            doctor_id=doctor.id
        )
        print(f"Added item: {item}")
        
        schedules = get_active_schedules(db, user.id)
        print(f"Active Schedules for patient: {len(schedules)}")
        for s in schedules:
            print(f"- {s.medicine_name}: {s.frequency} ({s.reminder_times}) until {s.end_date}")
            
        # 2. Test Email sending via create_reminder
        print("\nTesting Email Follow-up...")
        reminder = create_reminder(
            db=db,
            user_id=user.id,
            message="Please follow up in 3 days",
            time=datetime.now()
        )
        print(f"Created reminder: {reminder.id} - {reminder.message}")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_test()
