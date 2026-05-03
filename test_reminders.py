import os
import sys
from datetime import datetime, timedelta

# Setup path
backend_dir = os.path.join(os.path.dirname(__file__), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import text
from core.database import SessionLocal, engine, Base
from models.user import User
from models.visit import Visit
from models.prescription import Prescription, PrescriptionItem
from services.prescription_service import add_item
from services.reminder_service import create_reminder
from services.schedule_service import get_active_schedules, process_due_followups

def run_test():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    with engine.begin() as connection:
        try:
            connection.execute(text("ALTER TABLE reminders ADD COLUMN email_sent_24h BOOLEAN NOT NULL DEFAULT 0"))
        except Exception:
            pass # already exists
        try:
            connection.execute(text("ALTER TABLE reminders ADD COLUMN email_sent_1h BOOLEAN NOT NULL DEFAULT 0"))
        except Exception:
            pass # already exists
    
    db = SessionLocal()
    try:
        # Create a dummy user
        user = db.query(User).filter(User.email == "morbium2468@gmail.com").first()
        if not user:
            user = User(name="Test Patient", email="morbium2468@gmail.com", phone="+919284969160", role="patient")
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update just in case
            # user.phone = "+919284969160"
            # user.phone = "+919172663916"
            user.phone = "+919172977968"
            db.commit()
            
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
            
        # 1. Test WhatsApp scheduling via add_item (2 times a day)
        print("Testing WhatsApp Schedule Creation (2 times/day)...")
        item = add_item(
            db=db,
            prescription_id=prescription.id,
            medicine_name="MedAssist Test Tablet",
            dosage="1 tablet",
            duration="3 days",
            frequency="2 times/day",
            doctor_id=doctor.id
        )
        
        schedules = get_active_schedules(db, user.id)
        for s in schedules:
            if s.medicine_name == "MedAssist Test Tablet":
                print(f"Schedule Verified -> {s.medicine_name}: {s.frequency} ({s.reminder_times}) until {s.end_date}")
            
        # 2. Test Email sending for 24 hours prior
        print("\nTesting Follow-Up Email (24h before)...")
        time_24h_from_now = datetime.now() + timedelta(hours=24)
        reminder_24h = create_reminder(
            db=db,
            user_id=user.id,
            message="This is the 24h follow-up test",
            time=time_24h_from_now
        )
        
        # 3. Test Email sending for 1 hour prior
        print("Testing Follow-Up Email (1h before)...")
        time_1h_from_now = datetime.now() + timedelta(hours=1)
        reminder_1h = create_reminder(
            db=db,
            user_id=user.id,
            message="This is the 1h urgent follow-up test",
            time=time_1h_from_now
        )
        
        # 4. Trigger the background process that normally runs every 60s
        print("\nRunning the background scheduler process manually to trigger emails...")
        emails_sent = process_due_followups(db)
        print(f"Emails sent by scheduler: {emails_sent}")
        
        # 5. Trigger WhatsApp manually
        print("\nSending a test WhatsApp message to the patient right now...")
        from services.whatsapp_service import send_whatsapp_reminder
        status = send_whatsapp_reminder(phone=user.phone, medicine_name="MedAssist Test Tablet", dosage="1 tablet", time_label="Now")
        print(f"WhatsApp send status: {status}")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_test()
