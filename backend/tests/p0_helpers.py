"""Shared request helpers for the P0 integration tests."""

import io

from fastapi.testclient import TestClient

MINIMAL_PDF = (
    b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n"
    b"trailer\n<< /Root 1 0 R >>\n%%EOF"
)


def register_patient(client: TestClient, email: str) -> dict:
    response = client.post(
        "/api/v1/auth/register/patient",
        json={
            "name": f"Patient {email}",
            "email": email,
            "password": "TestPass#2026",
            "age": 30,
            "gender": "female",
            "allergies": "penicillin",
            "chronic_conditions": "asthma",
            "address": "Baner, Pune, Maharashtra, India",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def register_doctor(client: TestClient, email: str, license_number: str) -> dict:
    response = client.post(
        "/api/v1/auth/register/doctor",
        json={
            "name": f"Doctor {email}",
            "email": email,
            "password": "TestPass#2026",
            "specialization": "General Medicine",
            "license_number": license_number,
            "experience_years": 5,
            "hospital_affiliation": "Test Hospital",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def login(client: TestClient, email: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "TestPass#2026"},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def upload_report(client: TestClient, token: str, patient_id: str) -> str:
    response = client.post(
        f"/api/v1/reports/upload?patient_id={patient_id}",
        files={"file": ("lab.pdf", io.BytesIO(MINIMAL_PDF), "application/pdf")},
        headers=auth(token),
    )
    assert response.status_code == 200, response.text
    return response.json()["id"]
