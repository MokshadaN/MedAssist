"""Integration checks for framework-independent domain error mapping."""

from tests.p0_helpers import auth


def test_missing_risk_resource_uses_stable_domain_error(client, doctor_linked):
    response = client.get(
        "/api/v1/risk/00000000-0000-0000-0000-000000000000",
        headers=auth(doctor_linked["token"]),
    )
    assert response.status_code == 404
    assert response.json() == {
        "detail": "Prescription not found",
        "code": "not_found",
    }


def test_missing_report_download_uses_stable_domain_error(client, patient_a):
    response = client.get(
        "/api/v1/reports/download/missing.pdf",
        headers=auth(patient_a["token"]),
    )
    assert response.status_code == 404
    assert response.json() == {
        "detail": "Report not found",
        "code": "not_found",
    }
