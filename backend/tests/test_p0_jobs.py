"""P0 report, risk, and notification idempotency tests."""

import io
import json
from datetime import datetime, timedelta

from tests.p0_helpers import MINIMAL_PDF, auth, upload_report


def test_risk_job_is_idempotently_queued(client, doctor_linked, monkeypatch):
    from core.database import SessionLocal
    from models.prescription import Prescription
    from models.visit import Visit
    from workers import ai_tasks

    db = SessionLocal()
    try:
        visit = db.query(Visit).filter(Visit.session_id == doctor_linked["session_id"]).first()
        prescription = Prescription(
            visit_id=visit.id,
            doctor_id=doctor_linked["id"],
            notes="risk queue test",
        )
        db.add(prescription)
        db.commit()
        db.refresh(prescription)
        prescription_id = prescription.id
    finally:
        db.close()

    queued = {}

    def capture_task(*, args, task_id):
        queued["args"] = args
        queued["task_id"] = task_id

    monkeypatch.setattr(ai_tasks.run_risk_check_async, "apply_async", capture_task)
    first = client.post(
        "/api/v1/risk/run",
        json={"prescription_id": prescription_id},
        headers=auth(doctor_linked["token"]),
    )
    assert first.status_code == 200, first.text
    assert first.json()["status"] == "queued"
    assert queued["args"][2] == queued["task_id"]

    duplicate = client.post(
        "/api/v1/risk/run",
        json={"prescription_id": prescription_id},
        headers=auth(doctor_linked["token"]),
    )
    assert duplicate.status_code == 409
    status_response = client.get(
        f"/api/v1/risk/{prescription_id}",
        headers=auth(doctor_linked["token"]),
    )
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "queued"


def test_report_lifecycle_states_and_dedup(
    client, patient_a, patient_b, doctor_linked, doctor_unlinked
):
    report_id = upload_report(client, patient_a["token"], patient_a["id"])
    reports = client.get(
        f"/api/v1/reports/{patient_a['id']}",
        headers=auth(patient_a["token"]),
    )
    assert reports.status_code == 200
    own = next(report for report in reports.json() if report["id"] == report_id)
    assert own["analysis_status"] == "uploaded"

    download = client.get(own["file_url"], headers=auth(patient_a["token"]))
    assert download.status_code == 200
    assert download.headers["content-disposition"].startswith("attachment;")
    assert client.get(
        own["file_url"],
        headers=auth(patient_b["token"]),
    ).status_code == 404

    first = client.post(
        f"/api/v1/reports/{report_id}/analyze",
        headers=auth(patient_a["token"]),
    )
    assert first.status_code == 200, first.text
    assert first.json()["analysis_status"] == "queued"
    assert client.post(
        f"/api/v1/reports/{report_id}/analyze",
        headers=auth(patient_a["token"]),
    ).status_code == 409

    from core.database import SessionLocal
    from models.report import Report

    db = SessionLocal()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        report.analysis_status = "completed"
        db.commit()
    finally:
        db.close()

    assert client.post(
        f"/api/v1/reports/{report_id}/analyze",
        headers=auth(patient_a["token"]),
    ).status_code == 409
    assert client.get(
        f"/api/v1/reports/{patient_a['id']}",
        headers=auth(doctor_linked["token"]),
    ).status_code == 200
    assert client.get(
        f"/api/v1/reports/{patient_a['id']}",
        headers=auth(doctor_unlinked["token"]),
    ).status_code == 404
    assert client.delete(
        f"/api/v1/reports/{report_id}",
        headers=auth(patient_b["token"]),
    ).status_code == 404
    assert client.delete(
        f"/api/v1/reports/{report_id}",
        headers=auth(patient_a["token"]),
    ).status_code == 200


def test_stale_report_job_can_be_recovered(client, patient_a, monkeypatch):
    from core.database import SessionLocal
    from models.report import Report
    from workers import ai_tasks

    report_id = upload_report(client, patient_a["token"], patient_a["id"])
    db = SessionLocal()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        report.analysis_status = "processing"
        report.analysis_job_id = "abandoned-job"
        report.analysis_status_updated_at = datetime.utcnow() - timedelta(minutes=30)
        db.commit()
    finally:
        db.close()

    queued = {}

    def capture_task(*, args, task_id):
        queued["args"] = args
        queued["task_id"] = task_id

    monkeypatch.setattr(ai_tasks.analyze_report_async, "apply_async", capture_task)
    response = client.post(
        f"/api/v1/reports/{report_id}/analyze",
        headers=auth(patient_a["token"]),
    )
    assert response.status_code == 200, response.text
    assert response.json()["analysis_status"] == "queued"
    assert queued["task_id"] != "abandoned-job"
    assert queued["args"][2] == queued["task_id"]


def test_report_metrics_are_replaced_idempotently(client, patient_a):
    from core.database import SessionLocal
    from models.metric import MedicalMetric
    from models.report import Report
    from services.report_service import update_report_analysis

    report_id = upload_report(client, patient_a["token"], patient_a["id"])
    payload = json.dumps(
        {
            "analysis": {
                "report_metadata": {"date_of_report": "2026-09-30"},
                "detailed_metrics": [
                    {
                        "parameter": "Hemoglobin",
                        "value": "12.5",
                        "units": "g/dL",
                        "interpretation": "Normal",
                    }
                ],
            }
        }
    )
    db = SessionLocal()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        update_report_analysis(db, report, payload)
        update_report_analysis(db, report, payload)
        metrics = db.query(MedicalMetric).filter(MedicalMetric.report_id == report_id).all()
        assert len(metrics) == 1
        assert metrics[0].parameter == "Hemoglobin"
    finally:
        db.close()


def test_notification_deliveries_are_idempotent(patient_a, monkeypatch):
    from core.database import SessionLocal
    from models.medicine_schedule import MedicineSchedule
    from models.prescription import Prescription, PrescriptionItem
    from models.reminder import Reminder
    from models.sent_reminder import SentReminder
    from services import schedule_service

    now = datetime.now()
    db = SessionLocal()
    try:
        prescription = Prescription(notes="notification idempotency test")
        db.add(prescription)
        db.flush()
        item = PrescriptionItem(
            prescription_id=prescription.id,
            medicine_name="Test Medicine",
            dosage="1 tablet",
            duration="1 day",
            frequency="once",
        )
        db.add(item)
        db.flush()
        schedule = MedicineSchedule(
            prescription_item_id=item.id,
            patient_id=patient_a["id"],
            patient_phone="+919876543210",
            medicine_name="Test Medicine",
            dosage="1 tablet",
            frequency="once",
            reminder_times=json.dumps([now.strftime("%H:%M")]),
            start_date=now.date(),
            end_date=now.date() + timedelta(days=1),
            is_active=True,
        )
        followup = Reminder(
            user_id=patient_a["id"],
            message="Test follow-up",
            time=now + timedelta(hours=24),
        )
        db.add_all([schedule, followup])
        db.commit()

        whatsapp_calls = []
        email_calls = []
        monkeypatch.setattr(
            schedule_service,
            "send_whatsapp_reminder",
            lambda **kwargs: whatsapp_calls.append(kwargs) or "sent",
        )
        monkeypatch.setattr(
            schedule_service,
            "send_followup_email",
            lambda **kwargs: email_calls.append(kwargs) or True,
        )
        schedule_service.process_due_reminders(db)
        schedule_service.process_due_reminders(db)
        schedule_service.process_due_followups(db)
        schedule_service.process_due_followups(db)

        deliveries = db.query(SentReminder).filter(
            SentReminder.schedule_id == schedule.id
        ).all()
        db.refresh(followup)
        assert len(whatsapp_calls) == 1
        assert len(deliveries) == 1
        assert deliveries[0].status == "sent"
        assert len(email_calls) == 1
        assert followup.email_24h_status == "sent"
    finally:
        db.close()


def test_upload_for_another_patient_is_refused(
    client, patient_a, patient_b, doctor_unlinked
):
    hijack = client.post(
        f"/api/v1/reports/upload?patient_id={patient_b['id']}",
        files={"file": ("lab.pdf", io.BytesIO(MINIMAL_PDF), "application/pdf")},
        headers=auth(patient_a["token"]),
    )
    assert hijack.status_code == 404
    orphan_doctor = client.post(
        f"/api/v1/reports/upload?patient_id={patient_a['id']}",
        files={"file": ("lab.pdf", io.BytesIO(MINIMAL_PDF), "application/pdf")},
        headers=auth(doctor_unlinked["token"]),
    )
    assert orphan_doctor.status_code == 404
