"""Safety-first triage tests. No network calls are made."""

import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import services.session_service as session_service
import services.triage_service as triage_service


@pytest.fixture(scope="module")
def client():
    import main  # noqa: F401 — imported here so conftest env vars apply first

    with TestClient(main.app) as test_client:
        yield test_client


def _register_and_login(client: TestClient, email: str) -> str:
    client.post(
        "/api/v1/auth/register/patient",
        json={
            "name": f"Tier Test {email}",
            "email": email,
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
        data={"username": email, "password": "TestPass#2026"},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _start_session(client: TestClient, token: str) -> str:
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}).json()
    response = client.post(
        "/api/v1/chat/start",
        json={"patient_id": me["user"]["id"]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200, response.text
    return response.json()["id"]


def _answer(client: TestClient, token: str, session_id: str, message: str):
    return client.post(
        f"/api/v1/chat/{session_id}/intake",
        json={"message": message, "input_mode": "text", "previous_structured": None},
        headers={"Authorization": f"Bearer {token}"},
    )


# ── Triage service: rules override extraction-only LLMs ───────────────────

def _mock_groq(monkeypatch, payload: dict):
    """Make the extraction-only LLM path return the given JSON."""
    monkeypatch.setattr(
        triage_service, "_get_groq_client",
        lambda: SimpleNamespace(
            chat=SimpleNamespace(
                completions=SimpleNamespace(
                    create=lambda **kw: SimpleNamespace(
                        choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload)))]
                    )
                )
            )
        ),
    )
    triage_service.groq_breaker.reset()


def test_coughing_blood_is_emergency():
    result = triage_service.detect_urgent_red_flags("I'm coughing blood")
    assert result["urgent"] is True
    assert result["level"] == "emergency"
    assert "coughing_blood" in result["matched_rules"]


def test_blood_in_sputum_is_emergency():
    result = triage_service.detect_urgent_red_flags("There is blood in my sputum")
    assert result["level"] == "emergency"
    assert "blood_in_sputum" in result["matched_rules"]


def test_negated_coughing_blood_does_not_match():
    result = triage_service.detect_urgent_red_flags("I am not coughing blood")
    assert result["urgent"] is False
    assert result["level"] == "abstain"
    assert result["matched_rules"] == []


def test_hand_pain_with_coughing_blood_is_emergency():
    result = triage_service.detect_urgent_red_flags(
        "My left hand is hurting and I'm coughing blood."
    )
    assert result["level"] == "emergency"
    assert "coughing_blood" in result["matched_rules"]


def test_chest_symptom_with_hand_pain_is_emergency():
    result = triage_service.detect_urgent_red_flags(
        "I have chest discomfort and my left hand is hurting"
    )
    assert result["level"] == "emergency"
    assert "chest_with_arm_or_hand_pain" in result["matched_rules"]


def test_emergency_rule_overrides_llm_output(monkeypatch):
    _mock_groq(
        monkeypatch,
        {
            "level": "routine",
            "reason": "incorrect LLM urgency",
            "matched_terms": [],
        },
    )
    result = triage_service.detect_urgent_red_flags("I am coughing up blood")
    assert result["urgent"] is True
    assert result["level"] == "emergency"
    assert result["decision_source"] == "rule"


@pytest.mark.parametrize(
    ("patient_text", "concept"),
    [
        ("My chest feels tight", "chest_pain_or_tightness"),
        ("My chest hurts", "chest_pain_or_tightness"),
        (
            "My arms feel broken and I cannot lift them",
            "new_weakness_numbness_or_inability_to_move",
        ),
    ],
)
def test_semantic_extraction_escalates_wording_variants(
    monkeypatch,
    patient_text,
    concept,
):
    _mock_groq(
        monkeypatch,
        {
            "symptoms": [patient_text],
            "severity": None,
            "duration": None,
            "trend": None,
            "functional_impairment": None,
            "associated_symptoms": [],
            "negated_symptoms": [],
            "present_safety_concepts": [concept],
            "negated_safety_concepts": [],
        },
    )

    result = triage_service.detect_urgent_red_flags(patient_text)

    assert result["level"] == "emergency"
    assert result["decision_source"] == "extracted_fact_rule"
    assert f"semantic:{concept}" in result["matched_rules"]


def test_negated_semantic_concept_does_not_escalate(monkeypatch):
    _mock_groq(
        monkeypatch,
        {
            "symptoms": [],
            "severity": None,
            "duration": None,
            "trend": None,
            "functional_impairment": None,
            "associated_symptoms": [],
            "negated_symptoms": ["chest pain"],
            "present_safety_concepts": [],
            "negated_safety_concepts": ["chest_pain_or_tightness"],
        },
    )

    result = triage_service.detect_urgent_red_flags(
        "I do not have chest pain"
    )

    assert result["level"] == "abstain"
    assert result["urgent"] is False


def test_valid_extraction_still_abstains_without_classifier(monkeypatch):
    _mock_groq(
        monkeypatch,
        {
            "symptoms": ["headache"],
            "severity": "mild",
            "duration": "one day",
            "trend": "stable",
            "functional_impairment": False,
            "associated_symptoms": [],
            "negated_symptoms": [],
        },
    )
    result = triage_service.detect_urgent_red_flags("mild headache")
    assert result["urgent"] is False
    assert result["level"] == "abstain"
    assert result["decision_source"] == "extraction_only"
    assert result["review_required"] is True


def test_triage_extraction_falls_back_to_second_model(monkeypatch):
    calls = []
    payload = {
        "symptoms": ["headache"],
        "severity": "mild",
        "duration": None,
        "trend": None,
        "functional_impairment": None,
        "associated_symptoms": [],
        "negated_symptoms": [],
    }

    def create(**kwargs):
        calls.append(kwargs["model"])
        if kwargs["model"] == "test-primary":
            raise RuntimeError("primary unavailable")
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content=json.dumps(payload))
                )
            ]
        )

    monkeypatch.setenv("GROQ_TRIAGE_MODELS", "test-primary,test-fallback")
    monkeypatch.setattr(
        triage_service,
        "_get_groq_client",
        lambda: SimpleNamespace(
            chat=SimpleNamespace(
                completions=SimpleNamespace(create=create)
            )
        ),
    )
    triage_service.groq_breaker.reset()

    result = triage_service.detect_urgent_red_flags("mild headache")

    assert calls == ["test-primary", "test-fallback"]
    assert result["level"] == "abstain"
    assert result["decision_source"] == "extraction_only"
    assert result["model_version"] == "test-fallback"


def test_shadow_classifier_cannot_change_live_abstain_decision(monkeypatch):
    _mock_groq(
        monkeypatch,
        {
            "symptoms": ["left hand pain", "queasiness"],
            "severity": None,
            "duration": None,
            "trend": None,
            "functional_impairment": None,
            "associated_symptoms": ["queasiness"],
            "negated_symptoms": [],
        },
    )
    monkeypatch.setattr(
        triage_service,
        "run_shadow_classification",
        lambda text, facts: SimpleNamespace(
            status="completed",
            model_version="test-shadow-v1",
        ),
    )

    result = triage_service.detect_urgent_red_flags(
        "My left hand hurts and I feel queasy"
    )
    assert result["level"] == "abstain"
    assert result["decision_source"] == "extraction_only"
    assert result["shadow_classifier_status"] == "completed"
    assert result["shadow_model_version"] == "test-shadow-v1"


def test_llm_urgency_field_is_rejected_and_abstains(monkeypatch):
    _mock_groq(
        monkeypatch,
        {
            "symptoms": ["headache"],
            "severity": "mild",
            "duration": None,
            "trend": None,
            "functional_impairment": None,
            "associated_symptoms": [],
            "negated_symptoms": [],
            "level": "routine",
        },
    )
    result = triage_service.detect_urgent_red_flags("mild headache")
    assert result["level"] == "abstain"
    assert result["decision_source"] == "fallback"


def test_malformed_llm_output_abstains(monkeypatch):
    monkeypatch.setattr(
        triage_service,
        "_get_groq_client",
        lambda: SimpleNamespace(
            chat=SimpleNamespace(
                completions=SimpleNamespace(
                    create=lambda **kw: SimpleNamespace(
                        choices=[
                            SimpleNamespace(
                                message=SimpleNamespace(content="{not-json")
                            )
                        ]
                    )
                )
            )
        ),
    )
    triage_service.groq_breaker.reset()

    result = triage_service.detect_urgent_red_flags("mild headache")
    assert result["level"] == "abstain"
    assert result["decision_source"] == "fallback"


def test_patient_only_triage_text_excludes_ai_content():
    messages = [
        SimpleNamespace(sender="ai", message="Do you have chest pain?"),
        SimpleNamespace(sender="patient", message="No, I have a mild headache."),
        SimpleNamespace(sender="ai", message="Emergency advisory text"),
    ]
    text = session_service.build_patient_triage_text(messages)
    assert text == "No, I have a mild headache."
    assert "chest pain" not in text
    assert "advisory" not in text


# ── Session flow through the API ────────────────────────────────────────────

def test_urgent_care_answer_continues_intake_with_advisory(client: TestClient, monkeypatch):
    token = _register_and_login(client, "tier.advisory@example.com")
    session_id = _start_session(client, token)

    def fake_triage(text, user_id=None, db=None):
        return {"urgent": False, "level": "urgent_care", "reason": "worsening fever",
                "matched_terms": ["can't get out of bed"]}

    monkeypatch.setattr(session_service, "detect_urgent_red_flags", fake_triage)
    response = _answer(client, token, session_id, "feverish, worsening, can't get out of bed")
    assert response.status_code == 200, response.text

    body = response.json()
    assert body["status"] == "questionnaire_in_progress"   # intake NOT stopped
    assert body["advisory"] is not None
    assert "24 hours" in body["advisory"]
    assert "not a medical emergency" in body["advisory"]


def test_abstain_continues_intake_with_review_advisory(client: TestClient, monkeypatch):
    token = _register_and_login(client, "tier.abstain@example.com")
    session_id = _start_session(client, token)

    def fake_triage(text, user_id=None, db=None):
        return {
            "urgent": False,
            "level": "abstain",
            "reason": "uncertain",
            "matched_terms": [],
            "review_required": True,
        }

    monkeypatch.setattr(session_service, "detect_urgent_red_flags", fake_triage)
    response = _answer(client, token, session_id, "mild unclear symptoms")
    assert response.status_code == 200, response.text

    body = response.json()
    assert body["status"] == "questionnaire_in_progress"
    assert "could not determine urgency" in body["advisory"]
    assert "professional" in body["advisory"]
    assert body["triage_level"] == "abstain"
    assert body["review_required"] is True


def test_emergency_answer_stops_intake(client: TestClient, monkeypatch):
    token = _register_and_login(client, "tier.emergency@example.com")
    session_id = _start_session(client, token)

    def fake_triage(text, user_id=None, db=None):
        return {"urgent": True, "level": "emergency", "reason": "crushing chest pain",
                "matched_terms": ["crushing chest pain"], "nearest_hospitals": [],
                "emergency_message": "Medical emergency detected. Call emergency services immediately."}

    monkeypatch.setattr(session_service, "detect_urgent_red_flags", fake_triage)
    response = _answer(client, token, session_id, "crushing chest pain radiating to left arm")
    assert response.status_code == 200, response.text

    body = response.json()
    assert body["status"] == "urgent"                       # intake stopped
    assert "advisory" not in body or not body.get("advisory")
    assert "Immediate medical evaluation" in body["message"]


def test_routine_answer_has_no_advisory(client: TestClient, monkeypatch):
    token = _register_and_login(client, "tier.routine@example.com")
    session_id = _start_session(client, token)

    def fake_triage(text, user_id=None, db=None):
        return {"urgent": False, "level": "routine", "reason": "", "matched_terms": []}

    monkeypatch.setattr(session_service, "detect_urgent_red_flags", fake_triage)
    response = _answer(client, token, session_id, "mild headache")
    assert response.status_code == 200, response.text

    body = response.json()
    assert body["status"] == "questionnaire_in_progress"
    assert not body.get("advisory")