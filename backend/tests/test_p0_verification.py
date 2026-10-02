"""P0 doctor verification and emergency-profile tests."""

from tests.p0_helpers import auth, login, register_doctor


def test_registration_never_auto_verifies(client):
    for license_number in ("MMC-2018/04/1234", "LIC12345", "MCI-12345", "123456"):
        email_license = license_number.replace("/", "_")
        data = register_doctor(
            client,
            f"auto.verify.{email_license}@example.com",
            license_number,
        )
        profile = data["doctor_profile"]
        assert profile["is_verified"] is False
        assert profile["verification_status"] == "pending"


def test_verify_license_endpoint_submits_for_review_not_verification(client):
    token = login(client, "auto.verify.LIC12345@example.com")
    response = client.post(
        "/api/v1/doctor/verify-license",
        json={"license_number": "LIC12345"},
        headers=auth(token),
    )
    assert response.status_code == 200, response.text
    assert response.json()["is_verified"] is False
    assert response.json()["verification_status"] == "pending"


def test_admin_approval_is_required_and_admin_only(client, admin):
    from core.database import SessionLocal
    from models.user import User

    doctor_email = "auto.verify.lic12345@example.com"
    db = SessionLocal()
    try:
        doctor_id = db.query(User).filter(User.email == doctor_email).first().id
    finally:
        db.close()

    doctor_token = login(client, doctor_email)
    forbidden = client.post(
        f"/api/v1/admin/doctors/{doctor_id}/review",
        json={"action": "approve"},
        headers=auth(doctor_token),
    )
    assert forbidden.status_code == 403

    pending = client.get(
        "/api/v1/admin/doctors/pending",
        headers=auth(admin["token"]),
    )
    assert pending.status_code == 200
    assert any(doctor["user_id"] == doctor_id for doctor in pending.json())

    approve = client.post(
        f"/api/v1/admin/doctors/{doctor_id}/review",
        json={"action": "approve", "note": "registry checked"},
        headers=auth(admin["token"]),
    )
    assert approve.status_code == 200, approve.text
    assert approve.json()["is_verified"] is True
    assert approve.json()["verification_status"] == "approved"


def test_unverified_doctor_blocked_from_clinical_actions(
    client, patient_a, doctor_unverified, doctor_linked
):
    assert client.post(
        "/api/v1/visit/create",
        params={
            "patient_id": patient_a["id"],
            "session_id": doctor_linked["session_id"],
        },
        headers=auth(doctor_unverified["token"]),
    ).status_code == 403
    assert client.post(
        "/api/v1/risk/run",
        json={"prescription_id": "does-not-matter"},
        headers=auth(doctor_unverified["token"]),
    ).status_code == 403
    assert client.post(
        "/api/v1/prescription/create",
        json={"visit_id": "does-not-matter", "notes": "x"},
        headers=auth(doctor_unverified["token"]),
    ).status_code == 403


def test_patient_directory_only_lists_approved_doctors(
    client,
    patient_a,
    doctor_linked,
    doctor_unverified,
):
    response = client.get(
        "/api/v1/doctor/directory",
        headers=auth(patient_a["token"]),
    )

    assert response.status_code == 200, response.text
    doctor_ids = {doctor["id"] for doctor in response.json()}
    assert doctor_linked["id"] in doctor_ids
    assert doctor_unverified["id"] not in doctor_ids


def test_license_change_resets_verification(client, admin, doctor_linked):
    approve = client.post(
        f"/api/v1/admin/doctors/{doctor_linked['id']}/review",
        json={"action": "approve"},
        headers=auth(admin["token"]),
    )
    assert approve.status_code == 200, approve.text
    assert approve.json()["is_verified"] is True

    response = client.patch(
        "/api/v1/auth/me",
        json={"license_number": "KMC-999888"},
        headers=auth(doctor_linked["token"]),
    )
    assert response.status_code == 200, response.text
    assert response.json()["doctor_profile"]["is_verified"] is False
    assert response.json()["doctor_profile"]["verification_status"] == "pending"

    restore = client.post(
        f"/api/v1/admin/doctors/{doctor_linked['id']}/review",
        json={"action": "approve", "note": "fixture restored after reset assertion"},
        headers=auth(admin["token"]),
    )
    assert restore.status_code == 200


def test_public_profile_requires_consent_and_valid_token(client, patient_a):
    profile_id = patient_a["profile_id"]
    assert client.get(f"/api/v1/patient/public/{profile_id}").status_code == 404

    enable = client.post(
        "/api/v1/patient/profile/emergency-access",
        headers=auth(patient_a["token"]),
    )
    assert enable.status_code == 200, enable.text
    access_token = enable.json()["access_token"]

    assert client.get(f"/api/v1/patient/public/{profile_id}").status_code == 404
    assert client.get(
        f"/api/v1/patient/public/{profile_id}",
        params={"token": "wrong"},
    ).status_code == 404

    public = client.get(
        f"/api/v1/patient/public/{profile_id}",
        params={"token": access_token},
    )
    assert public.status_code == 200, public.text
    body = public.json()
    assert "allergies" in body and "medications" in body
    assert "address" not in body and "email" not in body

    disable = client.delete(
        "/api/v1/patient/profile/emergency-access",
        headers=auth(patient_a["token"]),
    )
    assert disable.status_code == 200
    assert client.get(
        f"/api/v1/patient/public/{profile_id}",
        params={"token": access_token},
    ).status_code == 404


def test_emergency_access_is_owner_only(client, patient_b):
    profile = client.get(
        "/api/v1/patient/profile",
        headers=auth(patient_b["token"]),
    )
    assert profile.status_code == 200
    assert profile.json()["emergency_access_token"] in (None, "")
