"""Voice STT endpoint tests (/ai/transcribe — Groq Whisper).

All provider calls are mocked — no network. Covers auth, validation
(size/type limits, empty speech) and the provider-unavailable 503 path.
"""

import io

import pytest
from fastapi.testclient import TestClient

import api.v1.endpoints.ai as ai_endpoint


@pytest.fixture(scope="module")
def client():
    import main  # noqa: F401 — imported here so conftest env vars apply first

    with TestClient(main.app) as test_client:
        yield test_client


@pytest.fixture(scope="module")
def patient_token(client: TestClient) -> str:
    client.post(
        "/api/v1/auth/register/patient",
        json={
            "name": "Voice Test Patient",
            "email": "voice.patient@example.com",
            "password": "TestPass#2026",
            "age": 30,
            "gender": "female",
            "allergies": "none",
            "chronic_conditions": "none",
            "address": "Baner, Pune, Maharashtra, India",
        },
    )
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "voice.patient@example.com", "password": "TestPass#2026"},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _upload(content: bytes, mime: str = "audio/webm", filename: str = "speech.webm"):
    return {"file": (filename, io.BytesIO(content), mime)}


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Auth ──────────────────────────────────────────────────────────────────

def test_transcribe_requires_auth(client: TestClient):
    response = client.post("/api/v1/ai/transcribe", files=_upload(b"audio-bytes"))
    assert response.status_code == 401


# ── Happy path (mocked provider) ───────────────────────────────────────────

def test_transcribe_returns_text(client: TestClient, patient_token: str, monkeypatch):
    def fake_transcribe(data, mime_type):
        assert mime_type == "audio/webm"
        assert data == b"audio-bytes"
        return "I have had a headache for three days"

    monkeypatch.setattr(ai_endpoint, "transcribe_audio", fake_transcribe)
    response = client.post(
        "/api/v1/ai/transcribe",
        files=_upload(b"audio-bytes"),
        headers=_auth(patient_token),
    )
    assert response.status_code == 200, response.text
    assert response.json() == {"text": "I have had a headache for three days"}


# ── Validation ─────────────────────────────────────────────────────────────

def test_transcribe_rejects_unsupported_type(client: TestClient, patient_token: str, monkeypatch):
    monkeypatch.setattr(ai_endpoint, "transcribe_audio", lambda d, m: "should not be called")
    response = client.post(
        "/api/v1/ai/transcribe",
        files=_upload(b"data", mime="video/mp4", filename="clip.mp4"),
        headers=_auth(patient_token),
    )
    assert response.status_code == 400


def test_transcribe_rejects_oversized_audio(client: TestClient, patient_token: str, monkeypatch):
    monkeypatch.setattr(ai_endpoint, "transcribe_audio", lambda d, m: "should not be called")
    response = client.post(
        "/api/v1/ai/transcribe",
        files=_upload(b"x" * (16 * 1024 * 1024)),
        headers=_auth(patient_token),
    )
    assert response.status_code == 413


def test_transcribe_empty_speech_is_400(client: TestClient, patient_token: str, monkeypatch):
    monkeypatch.setattr(ai_endpoint, "transcribe_audio", lambda d, m: "")
    response = client.post(
        "/api/v1/ai/transcribe",
        files=_upload(b"audio-bytes"),
        headers=_auth(patient_token),
    )
    assert response.status_code == 400


# ── Provider unavailable ───────────────────────────────────────────────────

def test_transcribe_provider_down_is_503(client: TestClient, patient_token: str, monkeypatch):
    def fake_transcribe(data, mime_type):
        raise RuntimeError("Voice transcription is temporarily unavailable")

    monkeypatch.setattr(ai_endpoint, "transcribe_audio", fake_transcribe)
    response = client.post(
        "/api/v1/ai/transcribe",
        files=_upload(b"audio-bytes"),
        headers=_auth(patient_token),
    )
    assert response.status_code == 503
    assert "temporarily unavailable" in response.json()["detail"]