"""OpenAPI contract coverage for JSON endpoints added during P2."""


def test_json_routes_publish_response_schemas(client):
    paths = client.get("/openapi.json").json()["paths"]
    routes = [
        ("/api/v1/prescription/create", "post", "201"),
        ("/api/v1/prescription/add-item", "post", "200"),
        ("/api/v1/prescription/my", "get", "200"),
        ("/api/v1/prescription/{visit_id}", "get", "200"),
        ("/api/v1/chat/{session_id}", "get", "200"),
        ("/api/v1/ai/generate-summary", "post", "200"),
        ("/api/v1/triage/analyze", "post", "200"),
        ("/api/v1/doctor/directory", "get", "200"),
        ("/api/v1/reports/{report_id}", "delete", "200"),
        ("/api/v1/reminders/{reminder_id}", "delete", "200"),
    ]

    for path, method, status_code in routes:
        response = paths[path][method]["responses"][status_code]
        assert "schema" in response["content"]["application/json"], (path, method)


def test_legacy_routes_are_marked_deprecated(client):
    paths = client.get("/openapi.json").json()["paths"]
    assert paths["/api/v1/chat/message"]["post"]["deprecated"] is True
    assert paths["/api/v1/reminders/create"]["post"]["deprecated"] is True
    assert paths["/api/v1/reminders/{user_id}"]["get"]["deprecated"] is True


def test_hard_coded_triage_stub_is_removed(client):
    response = client.get("/api/v1/triage/any-session")
    assert response.status_code == 404
