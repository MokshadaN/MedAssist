import sys
import uuid
from pathlib import Path
from datetime import datetime, timedelta
import json

sys.path.append(str(Path(__file__).resolve().parent))

from sqlalchemy.orm import Session
from core.database import SessionLocal, Base, engine
from services.auth_service import register_doctor, register_patient
from schemas.auth import DoctorRegister, PatientRegister
from models.user import User
from models.doctor import DoctorProfile
from models.patient import PatientProfile
from models.visit import Visit
from models.session import ChatSession
from models.message import ChatMessage
from models.reminder import Reminder
from models.prescription import Prescription, PrescriptionItem
from models.notification import Notification
from models.metric import MedicalMetric
from models.report import Report
from models.ai_summary import AISummary
from models.triage import TriageResult

def seed():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        print("Creating doctor profiles...")
        # 1. Doctor 1 - Dr. Evelyn Reed
        dr1_data = DoctorRegister(
            name="Dr. Evelyn Reed, MD",
            email="dr.smith@example.com",
            password="password123",
            phone="+1 415 892 4410",
            specialization="Cardiology & Internal Medicine",
            license_number="MCI-12345",
            experience_years=14,
            hospital_affiliation="Stanford Health Care & Memorial Hospital"
        )
        dr1_res = register_doctor(db, dr1_data)
        dr1_user = dr1_res["user"]
        dr1_prof = db.query(DoctorProfile).filter(DoctorProfile.user_id == dr1_user.id).first()
        if dr1_prof:
            dr1_prof.is_verified = True
            dr1_prof.verification_status = "verified"
            dr1_prof.qualification = "MBBS, MD (Cardiology), FACC"
            dr1_prof.state_council = "National Medical Commission (MCI)"
        
        # Doctor 2 - Dr. Marcus Vance
        dr2_data = DoctorRegister(
            name="Dr. Marcus Vance",
            email="dr.vance@example.com",
            password="password123",
            phone="+1 415 721 9931",
            specialization="Pulmonology & Critical Care",
            license_number="DMC-54321",
            experience_years=11,
            hospital_affiliation="UCSF Medical Center"
        )
        dr2_res = register_doctor(db, dr2_data)
        dr2_user = dr2_res["user"]
        dr2_prof = db.query(DoctorProfile).filter(DoctorProfile.user_id == dr2_user.id).first()
        if dr2_prof:
            dr2_prof.is_verified = True
            dr2_prof.verification_status = "verified"
            dr2_prof.qualification = "MD, FCCP"

        print("Creating patient profiles...")
        # 2. Patient 1 - Jane Doe
        pt1_data = PatientRegister(
            name="Jane Doe",
            email="jane.doe@example.com",
            password="password123",
            phone="+1 555 319 8820",
            age=32,
            gender="Female",
            allergies="Penicillin, Peanuts, Sulfa drugs",
            chronic_conditions="Mild Persistent Asthma, Stage 1 Hypertension"
        )
        pt1_res = register_patient(db, pt1_data)
        pt1_user = pt1_res["user"]
        pt1_prof = db.query(PatientProfile).filter(PatientProfile.user_id == pt1_user.id).first()
        if pt1_prof:
            pt1_prof.address = "742 Evergreen Terrace, Palo Alto, CA"
            pt1_prof.emergency_profile_enabled = True
            pt1_prof.emergency_access_token = "token_jane_emergency_secure_9841"
            pt1_prof.emergency_token_expires_at = datetime.utcnow() + timedelta(days=90)

        # Patient 2 - Robert Miller
        pt2_data = PatientRegister(
            name="Robert Miller",
            email="robert.miller@example.com",
            password="password123",
            phone="+1 555 423 7711",
            age=58,
            gender="Male",
            allergies="Codeine",
            chronic_conditions="Type 2 Diabetes Mellitus, Hyperlipidemia"
        )
        pt2_res = register_patient(db, pt2_data)
        pt2_user = pt2_res["user"]

        print("Creating Chat Sessions & Triage summaries...")
        # Chat Session for Jane Doe
        session1 = ChatSession(
            id=str(uuid.uuid4()),
            patient_id=pt1_user.id,
            status="completed",
            created_at=datetime.utcnow() - timedelta(days=2, hours=3)
        )
        db.add(session1)
        db.flush()

        msg1 = ChatMessage(session_id=session1.id, sender="user", message="Hi Doctor, I have been feeling tight in my chest and shortness of breath after my morning jog.")
        msg2 = ChatMessage(session_id=session1.id, sender="assistant", message="Hello Jane. Let's look into this right away. Are you experiencing any dizziness, pain radiating to your arm or jaw, or swelling in your ankles?")
        msg3 = ChatMessage(session_id=session1.id, sender="user", message="No radiating pain, just wheezing and a persistent dry cough. I used my rescue inhaler twice today.")
        db.add_all([msg1, msg2, msg3])

        # AI Summary (SOAP format)
        summary1 = AISummary(
            id=str(uuid.uuid4()),
            session_id=session1.id,
            subjective="Patient reports acute onset of exertional dyspnea, wheezing, and dry cough following exercise. Rescue inhaler provided transient relief. Denies orthopnea or palpitations.",
            objective="Vitals reported stable. Past history of mild persistent asthma and allergy to penicillin.",
            assessment="Acute asthma exacerbation triggered by exercise/environmental exposure with mild bronchospasm.",
            plan="Prescribe maintenance inhaled corticosteroid (Flovent) and continue Albuterol PRN. Check peak flow metrics daily. Schedule follow-up in 2 weeks."
        )
        db.add(summary1)

        # Triage Result
        triage1 = TriageResult(
            id=str(uuid.uuid4()),
            session_id=session1.id,
            severity="moderate",
            flags="Exertional wheezing refractory to single rescue puff; allergic asthma history",
            recommendation="Same-day telemedicine evaluation; step-up controller inhaler therapy"
        )
        db.add(triage1)

        # Visit 1 - Jane with Dr. Reed
        visit1 = Visit(
            id=str(uuid.uuid4()),
            patient_id=pt1_user.id,
            doctor_id=dr1_user.id,
            session_id=session1.id,
            status="completed",
            created_at=datetime.utcnow() - timedelta(days=2)
        )
        db.add(visit1)
        db.flush()

        # Visit 2 - Robert with Dr. Reed (Active / Upcoming)
        visit2 = Visit(
            id=str(uuid.uuid4()),
            patient_id=pt2_user.id,
            doctor_id=dr1_user.id,
            status="in_progress",
            created_at=datetime.utcnow() - timedelta(hours=2)
        )
        db.add(visit2)
        db.flush()

        print("Creating Prescriptions...")
        # Prescription for Jane Doe
        rx1 = Prescription(
            id=str(uuid.uuid4()),
            visit_id=visit1.id,
            doctor_id=dr1_user.id,
            notes="Continue peak-flow monitoring twice daily. Avoid known outdoor allergens and carry rescue inhaler.",
            created_at=datetime.utcnow() - timedelta(days=2)
        )
        db.add(rx1)
        db.flush()

        rx_items = [
            PrescriptionItem(
                id=str(uuid.uuid4()),
                prescription_id=rx1.id,
                medicine_name="Ventolin HFA (Albuterol)",
                dosage="90 mcg / actuation",
                frequency="2 puffs every 4-6 hours PRN",
                duration="30 days"
            ),
            PrescriptionItem(
                id=str(uuid.uuid4()),
                prescription_id=rx1.id,
                medicine_name="Flovent Diskus (Fluticasone)",
                dosage="100 mcg",
                frequency="1 puff twice daily",
                duration="60 days"
            ),
            PrescriptionItem(
                id=str(uuid.uuid4()),
                prescription_id=rx1.id,
                medicine_name="Montelukast (Singulair)",
                dosage="10 mg",
                frequency="1 tablet once daily (Evening)",
                duration="30 days"
            )
        ]
        db.add_all(rx_items)

        print("Creating Reminders & Notifications...")
        reminders = [
            Reminder(
                id=str(uuid.uuid4()),
                user_id=pt1_user.id,
                message="Morning Dose: Flovent Inhaler (1 puff) & Peak Flow Check",
                time=datetime.utcnow() + timedelta(hours=4),
                is_completed=False
            ),
            Reminder(
                id=str(uuid.uuid4()),
                user_id=pt1_user.id,
                message="Evening Dose: Montelukast 10mg with dinner",
                time=datetime.utcnow() + timedelta(hours=10),
                is_completed=False
            ),
            Reminder(
                id=str(uuid.uuid4()),
                user_id=pt1_user.id,
                message="Record Blood Pressure log",
                time=datetime.utcnow() - timedelta(hours=14),
                is_completed=True
            )
        ]
        db.add_all(reminders)

        notifications = [
            Notification(
                id=str(uuid.uuid4()),
                user_id=pt1_user.id,
                message="Prescription Issued by Dr. Evelyn Reed: Your updated asthma action plan and prescription are ready.",
                is_read=False,
                type="prescription",
                created_at=datetime.utcnow() - timedelta(hours=3)
            ),
            Notification(
                id=str(uuid.uuid4()),
                user_id=pt1_user.id,
                message="Lab Report Analyzed: Comprehensive Metabolic Panel completed. Normal electrolyte balance with mild eosinophilia.",
                is_read=True,
                type="report",
                created_at=datetime.utcnow() - timedelta(days=1)
            ),
            Notification(
                id=str(uuid.uuid4()),
                user_id=dr1_user.id,
                message="New Patient Triage Alert: Jane Doe completed AI Clinical Intake with Moderate triage score (68.5).",
                is_read=False,
                type="triage",
                created_at=datetime.utcnow() - timedelta(days=2)
            )
        ]
        db.add_all(notifications)

        print("Creating Reports & Metrics...")
        report1 = Report(
            id=str(uuid.uuid4()),
            patient_id=pt1_user.id,
            file_url="/uploads/reports/sample_comprehensive_panel.pdf",
            parsed_data=json.dumps({
                "patient_name": "Jane Doe",
                "test_date": "2026-09-28",
                "panel": "Complete Blood Count & Metabolic Profile",
                "findings": [
                    {"parameter": "Hemoglobin", "value": "13.8 g/dL", "status": "Normal", "range": "12.0 - 15.5 g/dL"},
                    {"parameter": "White Blood Cells (WBC)", "value": "7.4 K/uL", "status": "Normal", "range": "4.5 - 11.0 K/uL"},
                    {"parameter": "Eosinophils", "value": "5.8 %", "status": "Slightly Elevated (Allergic marker)", "range": "1.0 - 4.0 %"},
                    {"parameter": "Fasting Blood Glucose", "value": "92 mg/dL", "status": "Optimal", "range": "70 - 99 mg/dL"},
                    {"parameter": "Total Cholesterol", "value": "178 mg/dL", "status": "Desirable", "range": "< 200 mg/dL"}
                ],
                "ai_summary": "Overall normal haematological indices. Mild peripheral eosinophilia consistent with active allergic airway inflammation/asthma."
            }),
            analysis_status="completed",
            uploaded_at=datetime.utcnow() - timedelta(days=5)
        )
        db.add(report1)
        db.flush()

        # Metrics for Charts
        now = datetime.utcnow()
        metrics = [
            # Systolic BP
            MedicalMetric(patient_id=pt1_user.id, report_id=report1.id, parameter="Systolic BP", value=122.0, raw_value="122 mmHg", units="mmHg", interpretation="Normal", severity="green", measured_at=now - timedelta(days=14)),
            MedicalMetric(patient_id=pt1_user.id, report_id=report1.id, parameter="Systolic BP", value=126.0, raw_value="126 mmHg", units="mmHg", interpretation="Normal", severity="green", measured_at=now - timedelta(days=10)),
            MedicalMetric(patient_id=pt1_user.id, report_id=report1.id, parameter="Systolic BP", value=130.0, raw_value="130 mmHg", units="mmHg", interpretation="Pre-hypertension", severity="yellow", measured_at=now - timedelta(days=6)),
            MedicalMetric(patient_id=pt1_user.id, report_id=report1.id, parameter="Systolic BP", value=124.0, raw_value="124 mmHg", units="mmHg", interpretation="Normal", severity="green", measured_at=now - timedelta(days=2)),
            MedicalMetric(patient_id=pt1_user.id, report_id=report1.id, parameter="Systolic BP", value=120.0, raw_value="120 mmHg", units="mmHg", interpretation="Normal", severity="green", measured_at=now),

            # Heart Rate
            MedicalMetric(patient_id=pt1_user.id, report_id=report1.id, parameter="Heart Rate", value=74.0, raw_value="74 bpm", units="bpm", interpretation="Resting Normal", severity="green", measured_at=now - timedelta(days=14)),
            MedicalMetric(patient_id=pt1_user.id, report_id=report1.id, parameter="Heart Rate", value=78.0, raw_value="78 bpm", units="bpm", interpretation="Normal", severity="green", measured_at=now - timedelta(days=10)),
            MedicalMetric(patient_id=pt1_user.id, report_id=report1.id, parameter="Heart Rate", value=84.0, raw_value="84 bpm", units="bpm", interpretation="Elevated", severity="yellow", measured_at=now - timedelta(days=6)),
            MedicalMetric(patient_id=pt1_user.id, report_id=report1.id, parameter="Heart Rate", value=76.0, raw_value="76 bpm", units="bpm", interpretation="Normal", severity="green", measured_at=now - timedelta(days=2)),
            MedicalMetric(patient_id=pt1_user.id, report_id=report1.id, parameter="Heart Rate", value=72.0, raw_value="72 bpm", units="bpm", interpretation="Resting Optimal", severity="green", measured_at=now),

            # Blood Glucose
            MedicalMetric(patient_id=pt1_user.id, report_id=report1.id, parameter="Fasting Glucose", value=90.0, raw_value="90 mg/dL", units="mg/dL", interpretation="Optimal", severity="green", measured_at=now - timedelta(days=14)),
            MedicalMetric(patient_id=pt1_user.id, report_id=report1.id, parameter="Fasting Glucose", value=95.0, raw_value="95 mg/dL", units="mg/dL", interpretation="Normal", severity="green", measured_at=now - timedelta(days=7)),
            MedicalMetric(patient_id=pt1_user.id, report_id=report1.id, parameter="Fasting Glucose", value=92.0, raw_value="92 mg/dL", units="mg/dL", interpretation="Normal", severity="green", measured_at=now)
        ]
        db.add_all(metrics)

        db.commit()
        print("Rich mock data seeded successfully!")
        print(f"Doctor Login: dr.smith@example.com / password123")
        print(f"Patient Login: jane.doe@example.com / password123")
        print(f"Emergency Token: {pt1_prof.emergency_access_token if pt1_prof else 'N/A'}")
        print(f"Patient ID: {pt1_user.id}")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
