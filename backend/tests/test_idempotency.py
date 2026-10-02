"""P2 request-level idempotency coverage."""

from tests.p0_helpers import auth


def test_one_visit_per_intake_session_returns_existing_visit(
    client,
    patient_a,
    doctor_linked,
):
    session_response = client.post(
        "/api/v1/chat/start",
        json={"patient_id": patient_a["id"]},
        headers=auth(patient_a["token"]),
    )
    assert session_response.status_code == 200, session_response.text
    session_id = session_response.json()["id"]
    params = {"doctor_id": doctor_linked["id"], "session_id": session_id}

    first = client.post(
        "/api/v1/visit/patient-create",
        params=params,
        headers=auth(patient_a["token"]),
    )
    retry = client.post(
        "/api/v1/visit/patient-create",
        params=params,
        headers=auth(patient_a["token"]),
    )
    doctor_retry = client.post(
        "/api/v1/visit/create",
        params={"patient_id": patient_a["id"], "session_id": session_id},
        headers=auth(doctor_linked["token"]),
    )

    assert first.status_code == 201, first.text
    assert retry.status_code == 201, retry.text
    assert doctor_retry.status_code == 201, doctor_retry.text
    assert retry.json()["visit_id"] == first.json()["visit_id"]
    assert doctor_retry.json()["visit_id"] == first.json()["visit_id"]

    from core.database import SessionLocal
    from models.visit import Visit

    db = SessionLocal()
    try:
        assert db.query(Visit).filter(Visit.session_id == session_id).count() == 1
    finally:
        db.close()


def test_intake_session_cannot_be_reassigned_on_retry(
    client,
    patient_a,
    doctor_linked,
    doctor_unlinked,
):
    session_response = client.post(
        "/api/v1/chat/start",
        json={"patient_id": patient_a["id"]},
        headers=auth(patient_a["token"]),
    )
    session_id = session_response.json()["id"]
    first = client.post(
        "/api/v1/visit/patient-create",
        params={"doctor_id": doctor_linked["id"], "session_id": session_id},
        headers=auth(patient_a["token"]),
    )
    conflict = client.post(
        "/api/v1/visit/patient-create",
        params={"doctor_id": doctor_unlinked["id"], "session_id": session_id},
        headers=auth(patient_a["token"]),
    )

    assert first.status_code == 201, first.text
    assert conflict.status_code == 409


def test_reminder_idempotency_key_returns_original_reminder(client, patient_a):
    first = client.post(
        "/api/v1/reminders/me",
        json={
            "message": "first request",
            "time": "2026-12-10T09:00:00",
            "idempotency_key": "follow-up-2026-12-10",
        },
        headers=auth(patient_a["token"]),
    )
    retry = client.post(
        "/api/v1/reminders/me",
        json={
            "message": "changed retry payload",
            "time": "2026-12-11T10:00:00",
            "idempotency_key": "follow-up-2026-12-10",
        },
        headers=auth(patient_a["token"]),
    )

    assert first.status_code == 201, first.text
    assert retry.status_code == 201, retry.text
    assert retry.json()["id"] == first.json()["id"]
    assert retry.json()["message"] == "first request"
    assert retry.json()["idempotency_key"] == "follow-up-2026-12-10"


def test_reminders_without_idempotency_keys_are_independent(client, patient_a):
    payload = {
        "message": "independent reminder",
        "time": "2026-12-12T09:00:00",
    }
    first = client.post(
        "/api/v1/reminders/me",
        json=payload,
        headers=auth(patient_a["token"]),
    )
    second = client.post(
        "/api/v1/reminders/me",
        json=payload,
        headers=auth(patient_a["token"]),
    )

    assert first.status_code == 201, first.text
    assert second.status_code == 201, second.text
    assert first.json()["id"] != second.json()["id"]
