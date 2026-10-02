"""P0 PHI authorization matrix."""

import io

import pytest

from tests.p0_helpers import MINIMAL_PDF, auth, login, register_doctor


ANONYMOUS_ROUTES = [
    ("post", "/api/v1/chat/start"),
    ("post", "/api/v1/chat/00000000-0000-0000-0000-000000000000/intake"),
    ("get", "/api/v1/chat/00000000-0000-0000-0000-000000000000"),
    ("post", "/api/v1/chat/message"),
    ("post", "/api/v1/ai/generate-summary"),
    ("get", "/api/v1/ai/summary/00000000-0000-0000-0000-000000000000"),
    ("get", "/api/v1/reports/download/missing.pdf"),
    ("get", "/api/v1/reports/00000000-0000-0000-0000-000000000000"),
    ("delete", "/api/v1/reports/00000000-0000-0000-0000-000000000000"),
    ("post", "/api/v1/reports/00000000-0000-0000-0000-000000000000/analyze"),
    ("get", "/api/v1/reports/00000000-0000-0000-0000-000000000000/metrics"),
    ("get", "/api/v1/reminders/me"),
    ("post", "/api/v1/reminders/create"),
    ("get", "/api/v1/reminders/00000000-0000-0000-0000-000000000000"),
    ("patch", "/api/v1/reminders/00000000-0000-0000-0000-000000000000/complete"),
    ("delete", "/api/v1/reminders/00000000-0000-0000-0000-000000000000"),
    ("delete", "/api/v1/schedules/00000000-0000-0000-0000-000000000000"),
    ("get", "/api/v1/schedules/me"),
    ("get", "/api/v1/schedules/patient/00000000-0000-0000-0000-000000000000"),
    ("get", "/api/v1/admin/doctors/pending"),
]


@pytest.mark.parametrize("method,url", ANONYMOUS_ROUTES)
def test_anonymous_access_denied(client, method, url):
    kwargs = {"json": {}} if method in {"post", "patch"} else {}
    response = getattr(client, method)(url, **kwargs)
    assert response.status_code == 401, f"{method.upper()} {url} returned {response.status_code}"


def test_anonymous_upload_and_transcription_denied(client):
    report = client.post(
        "/api/v1/reports/upload?patient_id=00000000-0000-0000-0000-000000000000",
        files={"file": ("lab.pdf", io.BytesIO(MINIMAL_PDF), "application/pdf")},
    )
    assert report.status_code == 401
    transcription = client.post(
        "/api/v1/ai/transcribe",
        files={"file": ("speech.webm", io.BytesIO(b"audio"), "audio/webm")},
    )
    assert transcription.status_code == 401


def test_patient_reads_own_reports_not_others(client, patient_a, patient_b):
    own = client.get(f"/api/v1/reports/{patient_a['id']}", headers=auth(patient_a["token"]))
    assert own.status_code == 200
    other = client.get(
        f"/api/v1/reports/{patient_b['id']}",
        headers=auth(patient_a["token"]),
    )
    assert other.status_code == 404


def test_patient_reads_own_session_not_others(client, patient_a, patient_b, doctor_linked):
    own = client.get(
        f"/api/v1/chat/{doctor_linked['session_id']}",
        headers=auth(patient_a["token"]),
    )
    assert own.status_code == 200
    other = client.get(
        f"/api/v1/chat/{doctor_linked['session_id']}",
        headers=auth(patient_b["token"]),
    )
    assert other.status_code == 404


def test_patient_starts_session_only_for_self(client, patient_a, patient_b):
    response = client.post(
        "/api/v1/chat/start",
        json={"patient_id": patient_b["id"]},
        headers=auth(patient_a["token"]),
    )
    assert response.status_code == 403


def test_summary_generation_is_session_scoped(
    client, patient_a, patient_b, doctor_linked, monkeypatch
):
    from api.v1.endpoints import ai as ai_endpoint
    from core.database import SessionLocal
    from services.message_service import create_message

    db = SessionLocal()
    try:
        create_message(
            db,
            session_id=doctor_linked["session_id"],
            message="I have had a mild headache for two days",
            sender="patient",
        )
    finally:
        db.close()

    captured = {}

    def fake_summary(transcript):
        captured["transcript"] = transcript
        return {"status": "complete", "clinical_summary": "summary", "structured_data": {}}

    monkeypatch.setattr(ai_endpoint, "analyze_patient_transcript", fake_summary)
    own = client.post(
        "/api/v1/ai/generate-summary",
        json={"session_id": doctor_linked["session_id"]},
        headers=auth(patient_a["token"]),
    )
    assert own.status_code == 200, own.text
    assert "mild headache" in captured["transcript"]
    unrelated = client.post(
        "/api/v1/ai/generate-summary",
        json={"session_id": doctor_linked["session_id"]},
        headers=auth(patient_b["token"]),
    )
    assert unrelated.status_code == 404


def test_patient_reminder_ownership(client, patient_a, patient_b):
    created = client.post(
        "/api/v1/reminders/create",
        json={
            "user_id": patient_a["id"],
            "message": "follow-up",
            "time": "2026-12-01T09:00:00",
        },
        headers=auth(patient_a["token"]),
    )
    assert created.status_code == 201, created.text
    reminder_id = created.json()["id"]

    own_list = client.get(
        f"/api/v1/reminders/{patient_a['id']}",
        headers=auth(patient_a["token"]),
    )
    assert own_list.status_code == 200
    assert any(reminder["id"] == reminder_id for reminder in own_list.json())
    assert client.get(
        f"/api/v1/reminders/{patient_a['id']}",
        headers=auth(patient_b["token"]),
    ).status_code == 404
    assert client.post(
        "/api/v1/reminders/create",
        json={
            "user_id": patient_b["id"],
            "message": "x",
            "time": "2026-12-01T09:00:00",
        },
        headers=auth(patient_a["token"]),
    ).status_code == 404
    assert client.patch(
        f"/api/v1/reminders/{reminder_id}/complete",
        json={"is_completed": True},
        headers=auth(patient_b["token"]),
    ).status_code == 404
    assert client.delete(
        f"/api/v1/reminders/{reminder_id}",
        headers=auth(patient_a["token"]),
    ).status_code == 200


def test_doctor_access_requires_care_relationship(
    client, patient_a, doctor_linked, doctor_unlinked
):
    assert client.get(
        f"/api/v1/reports/{patient_a['id']}",
        headers=auth(doctor_linked["token"]),
    ).status_code == 200
    assert client.get(
        f"/api/v1/chat/{doctor_linked['session_id']}",
        headers=auth(doctor_linked["token"]),
    ).status_code == 200
    assert client.get(
        f"/api/v1/schedules/patient/{patient_a['id']}",
        headers=auth(doctor_linked["token"]),
    ).status_code == 200
    assert client.get(
        f"/api/v1/reports/{patient_a['id']}",
        headers=auth(doctor_unlinked["token"]),
    ).status_code == 404
    assert client.get(
        f"/api/v1/chat/{doctor_linked['session_id']}",
        headers=auth(doctor_unlinked["token"]),
    ).status_code == 404
    assert client.get(
        f"/api/v1/schedules/patient/{patient_a['id']}",
        headers=auth(doctor_unlinked["token"]),
    ).status_code == 404


def test_doctor_reminder_for_linked_patient_only(
    client, patient_a, patient_b, doctor_linked, doctor_unlinked
):
    ok = client.post(
        "/api/v1/reminders/create",
        json={
            "user_id": patient_a["id"],
            "message": "check-up",
            "time": "2026-12-02T09:00:00",
        },
        headers=auth(doctor_linked["token"]),
    )
    assert ok.status_code == 201, ok.text
    denied = client.post(
        "/api/v1/reminders/create",
        json={
            "user_id": patient_b["id"],
            "message": "check-up",
            "time": "2026-12-02T09:00:00",
        },
        headers=auth(doctor_unlinked["token"]),
    )
    assert denied.status_code == 404


def test_unverified_doctor_cannot_read_linked_patient_phi(client, patient_a):
    data = register_doctor(client, "unverified.linked.p0@example.com", "MMC-444455")
    doctor_id = data["user"]["id"]
    doctor_token = login(client, "unverified.linked.p0@example.com")
    session = client.post(
        "/api/v1/chat/start",
        json={"patient_id": patient_a["id"]},
        headers=auth(patient_a["token"]),
    )
    assert session.status_code == 200, session.text
    visit = client.post(
        "/api/v1/visit/patient-create",
        params={"doctor_id": doctor_id, "session_id": session.json()["id"]},
        headers=auth(patient_a["token"]),
    )
    assert visit.status_code == 201, visit.text
    reports = client.get(
        f"/api/v1/reports/{patient_a['id']}",
        headers=auth(doctor_token),
    )
    assert reports.status_code == 403
