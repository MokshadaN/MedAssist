"""Test configuration — runs before the app is imported.

Points the app at a throwaway SQLite database and disables rate limiting so
the RBAC matrix tests are deterministic and isolated from real infrastructure.
"""

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Must be set BEFORE any application module is imported (core.config reads it
# at import time and caches the engine).
os.environ.setdefault("ENVIRONMENT", "development")
os.environ["DATABASE_URL"] = f"sqlite:///{(BACKEND_DIR / 'test_medassist.db').as_posix()}"

# Keep AI providers out of the tests: no Gemini/Groq/HF network calls.
os.environ["GOOGLE_API_KEY"] = ""
os.environ["GROQ_API_KEY"] = ""
os.environ["HF_TOKEN"] = ""
os.environ["SENTRY_DSN"] = ""


def _prepare() -> None:
    # Remove any leftover test database so create_all starts clean.
    db_file = BACKEND_DIR / "test_medassist.db"
    if db_file.exists():
        db_file.unlink()

    # Disable slowapi rate limits for the whole test run (TestClient shares one
    # IP, so register/login limits would otherwise trigger 429s).
    from core.limiter import limiter

    limiter.enabled = False


_prepare()


@pytest.fixture(scope="session")
def client():
    import main

    with TestClient(main.app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def no_celery_dispatch(monkeypatch):
    """Never publish integration-test tasks to a real broker."""
    from workers import ai_tasks

    monkeypatch.setattr(
        ai_tasks.analyze_report_async,
        "apply_async",
        lambda *args, **kwargs: None,
        raising=False,
    )
    monkeypatch.setattr(
        ai_tasks.run_risk_check_async,
        "apply_async",
        lambda *args, **kwargs: None,
        raising=False,
    )


@pytest.fixture(scope="session")
def admin(client):
    from core.database import SessionLocal
    from models.user import User
    from tests.p0_helpers import login
    from utils.security import hash_password

    db = SessionLocal()
    try:
        user = User(
            name="Test Admin",
            email="admin.p0@example.com",
            password_hash=hash_password("TestPass#2026"),
            role="admin",
        )
        db.add(user)
        db.commit()
        admin_id = user.id
    finally:
        db.close()
    return {"id": admin_id, "token": login(client, "admin.p0@example.com")}


@pytest.fixture(scope="session")
def patient_a(client):
    from tests.p0_helpers import login, register_patient

    data = register_patient(client, "a.p0@example.com")
    return {
        "id": data["user"]["id"],
        "profile_id": data["patient_profile"]["id"],
        "token": login(client, "a.p0@example.com"),
    }


@pytest.fixture(scope="session")
def patient_b(client):
    from tests.p0_helpers import login, register_patient

    data = register_patient(client, "b.p0@example.com")
    return {
        "id": data["user"]["id"],
        "profile_id": data["patient_profile"]["id"],
        "token": login(client, "b.p0@example.com"),
    }


@pytest.fixture(scope="session")
def doctor_linked(client, patient_a, admin):
    from tests.p0_helpers import auth, login, register_doctor

    data = register_doctor(client, "linked.doc.p0@example.com", "MMC-2018/04/1234")
    doctor_id = data["user"]["id"]
    token = login(client, "linked.doc.p0@example.com")

    session = client.post(
        "/api/v1/chat/start",
        json={"patient_id": patient_a["id"]},
        headers=auth(patient_a["token"]),
    )
    assert session.status_code == 200, session.text
    session_id = session.json()["id"]

    visit = client.post(
        "/api/v1/visit/patient-create",
        params={"doctor_id": doctor_id, "session_id": session_id},
        headers=auth(patient_a["token"]),
    )
    assert visit.status_code == 201, visit.text

    approval = client.post(
        f"/api/v1/admin/doctors/{doctor_id}/review",
        json={"action": "approve", "note": "test fixture approval"},
        headers=auth(admin["token"]),
    )
    assert approval.status_code == 200, approval.text
    return {"id": doctor_id, "token": token, "session_id": session_id}


@pytest.fixture(scope="session")
def doctor_unlinked(client, admin):
    from tests.p0_helpers import auth, login, register_doctor

    data = register_doctor(client, "unlinked.doc.p0@example.com", "DMC-54321")
    doctor_id = data["user"]["id"]
    approval = client.post(
        f"/api/v1/admin/doctors/{doctor_id}/review",
        json={"action": "approve", "note": "verified but unrelated test fixture"},
        headers=auth(admin["token"]),
    )
    assert approval.status_code == 200, approval.text
    return {"id": doctor_id, "token": login(client, "unlinked.doc.p0@example.com")}


@pytest.fixture(scope="session")
def doctor_unverified(client):
    from tests.p0_helpers import login, register_doctor

    data = register_doctor(client, "unverified.doc.p0@example.com", "DMC-888899")
    return {
        "id": data["user"]["id"],
        "token": login(client, "unverified.doc.p0@example.com"),
    }