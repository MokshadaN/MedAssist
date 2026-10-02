"""Contract coverage for bounded array pagination."""

import pytest

from tests.p0_helpers import auth


PAGINATED_ROUTES = [
    ("/api/v1/doctor/directory", "get"),
    ("/api/v1/doctor/patients", "get"),
    ("/api/v1/doctor/history/{patient_id}", "get"),
    ("/api/v1/visit/my", "get"),
    ("/api/v1/reports/{patient_id}", "get"),
    ("/api/v1/reports/{patient_id}/metrics", "get"),
    ("/api/v1/reminders/me", "get"),
    ("/api/v1/reminders/{user_id}", "get"),
    ("/api/v1/notifications", "get"),
    ("/api/v1/prescription/my", "get"),
    ("/api/v1/schedules/me", "get"),
    ("/api/v1/schedules/patient/{patient_id}", "get"),
    ("/api/v1/admin/doctors/pending", "get"),
]


@pytest.mark.parametrize(("path", "method"), PAGINATED_ROUTES)
def test_list_routes_publish_bounded_pagination(client, path, method):
    operation = client.get("/openapi.json").json()["paths"][path][method]
    parameters = {
        parameter["name"]: parameter
        for parameter in operation["parameters"]
        if parameter["in"] == "query"
    }

    assert parameters["limit"]["schema"]["default"] == 50
    assert parameters["limit"]["schema"]["minimum"] == 1
    assert parameters["limit"]["schema"]["maximum"] == 100
    assert parameters["offset"]["schema"]["default"] == 0
    assert parameters["offset"]["schema"]["minimum"] == 0
    assert operation["responses"]["200"]["content"]["application/json"]["schema"]["type"] == "array"


@pytest.mark.parametrize(
    "query",
    [
        {"limit": 0},
        {"limit": 101},
        {"offset": -1},
    ],
)
def test_pagination_rejects_out_of_bounds_values(client, patient_a, query):
    response = client.get(
        "/api/v1/doctor/directory",
        params=query,
        headers=auth(patient_a["token"]),
    )
    assert response.status_code == 422


def test_directory_pagination_keeps_array_shape(client, patient_a):
    response = client.get(
        "/api/v1/doctor/directory",
        params={"limit": 1, "offset": 0},
        headers=auth(patient_a["token"]),
    )

    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)
    assert len(response.json()) <= 1
