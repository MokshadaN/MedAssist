"""AI provider resilience tests.

Covers the layered resilience chain in services/ai_service.py:
  1. API-key rotation on quota errors (GOOGLE_API_KEYS)
  2. Per-key circuit breakers (an open breaker skips only its own key)
  3. Model fallback for non-quota errors
  4. Groq cross-provider fallback
  5. Deterministic degradation when every provider is down

All Gemini/Groq clients are mocked — no network calls are made.
"""

import json
from types import SimpleNamespace

import pytest

import services.ai_service as ai_service
from core.circuit_breaker import groq_breaker
from services.ai_service import IntakeOutput, safe_generate_content


# ── Fake errors ───────────────────────────────────────────────────────────

class FakeQuotaError(Exception):
    """Mimics google.genai 429 RESOURCE_EXHAUSTED responses."""
    code = 429
    status = "RESOURCE_EXHAUSTED"

    def __str__(self):
        return "429 RESOURCE_EXHAUSTED. Gemini free-tier quota exceeded."


class FakeTransientError(Exception):
    """Generic upstream error — must trigger retry/model fallback, not rotation."""


class FakeOverloadError(Exception):
    """Mimics google.genai 503 UNAVAILABLE 'high demand' responses."""
    code = 503
    status = "UNAVAILABLE"


# ── Fake clients ──────────────────────────────────────────────────────────

def _gemini_factory(monkeypatch, behaviour_by_key=None, parsed=None, text="ok", calls=None):
    """Patch ai_service.genai.Client with a fake returning per-key behaviour."""
    behaviour_by_key = behaviour_by_key or {}
    calls = calls if calls is not None else []

    def factory(api_key, **_kwargs):
        def generate_content(model, contents, config=None):
            calls.append((api_key, model))
            behaviour = behaviour_by_key.get(api_key)
            if behaviour is not None:
                raise behaviour
            return SimpleNamespace(parsed=parsed, text=text)
        return SimpleNamespace(models=SimpleNamespace(generate_content=generate_content))

    monkeypatch.setattr(ai_service.genai, "Client", factory)


def _groq_factory(monkeypatch, payload, calls=None):
    """Patch ai_service.Groq with a fake returning the given JSON payload."""
    calls = calls if calls is not None else []

    def factory(api_key=None, **_kwargs):
        def create(**kwargs):
            calls.append(kwargs)
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload)))]
            )
        return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))

    monkeypatch.setattr(ai_service, "Groq", factory)


@pytest.fixture(autouse=True)
def _reset_ai_state(monkeypatch):
    """Fresh per-key breakers, no real sleeps, and empty AI keys for every test."""
    ai_service._gemini_key_breakers.clear()
    groq_breaker.reset()
    monkeypatch.setattr(ai_service.time, "sleep", lambda _s: None)
    monkeypatch.delenv("GOOGLE_API_KEYS", raising=False)
    monkeypatch.setenv("GOOGLE_API_KEY", "")
    monkeypatch.setenv("GROQ_API_KEY", "")
    yield
    ai_service._gemini_key_breakers.clear()
    groq_breaker.reset()


# ── Key list parsing ───────────────────────────────────────────────────────

def test_get_api_keys_multi(monkeypatch):
    monkeypatch.setenv("GOOGLE_API_KEYS", "key1, key2 ,,key3")
    assert ai_service._get_api_keys() == ["key1", "key2", "key3"]


def test_get_api_keys_falls_back_to_single(monkeypatch):
    monkeypatch.setenv("GOOGLE_API_KEY", "single-key")
    assert ai_service._get_api_keys() == ["single-key"]


def test_get_api_keys_empty_when_nothing_configured():
    assert ai_service._get_api_keys() == []


def test_get_api_keys_capped(monkeypatch):
    monkeypatch.setenv("GOOGLE_API_KEYS", "a,b,c,d,e,f,g")
    keys = ai_service._get_api_keys()
    assert keys == ["a", "b", "c", "d", "e"]  # capped at MAX_API_KEYS


# ── Layer 1: key rotation ─────────────────────────────────────────────────

def test_quota_error_rotates_to_next_key(monkeypatch):
    calls = []
    _gemini_factory(
        monkeypatch,
        behaviour_by_key={"key1": FakeQuotaError()},
        parsed=IntakeOutput(
            structured_data=ai_service.VisitData(name="cough"),
            clinical_summary="S: cough",
        ),
        calls=calls,
    )
    monkeypatch.setenv("GOOGLE_API_KEYS", "key1,key2")

    result = safe_generate_content("transcript", IntakeOutput)

    assert isinstance(result, IntakeOutput)
    assert result.structured_data.name == "cough"
    # Quota error → rotate immediately: primary model tried exactly ONCE on
    # key1 (no pointless retry/model loop on an exhausted key) before key2.
    assert [m for k, m in calls if k == "key1"] == [ai_service.PRIMARY_MODEL]
    assert any(k == "key2" for k, _ in calls)


def test_open_breaker_skips_only_its_own_key(monkeypatch):
    # Burn key1's breaker open (5 consecutive failures).
    breaker = ai_service._breaker_for_key(0)
    for _ in range(5):
        with pytest.raises(FakeTransientError):
            breaker.call(lambda: (_ for _ in ()).throw(FakeTransientError("boom")))
    assert breaker.opened

    calls = []
    _gemini_factory(monkeypatch, text="key2-ok", calls=calls)
    monkeypatch.setenv("GOOGLE_API_KEYS", "key1,key2")

    result = safe_generate_content("prompt")

    assert result == "key2-ok"
    assert all(k == "key2" for k, _ in calls)  # key1 never contacted


# ── Layer 2: model fallback ───────────────────────────────────────────────

def test_transient_error_falls_back_to_backup_model(monkeypatch):
    calls = []

    def factory(api_key, **_kwargs):
        def generate_content(model, contents, config=None):
            calls.append(model)
            if model == ai_service.PRIMARY_MODEL:
                raise FakeTransientError("503 upstream hiccup")
            return SimpleNamespace(parsed=None, text="backup-ok")
        return SimpleNamespace(models=SimpleNamespace(generate_content=generate_content))

    monkeypatch.setattr(ai_service.genai, "Client", factory)
    monkeypatch.setenv("GOOGLE_API_KEY", "only-key")

    result = safe_generate_content("prompt")

    assert result == "backup-ok"
    assert ai_service.PRIMARY_MODEL in calls            # tried first…
    assert calls[-1] != ai_service.PRIMARY_MODEL        # …then a backup saved it


# ── Layer 3: Groq cross-provider fallback ─────────────────────────────────

def test_overload_error_skips_same_model_retry(monkeypatch):
    """A 503 'high demand' answer must NOT be retried on the same model —
    the next model is tried immediately (retrying burns ~8s for nothing)."""
    calls = []

    def factory(api_key, **_kwargs):
        def generate_content(model, contents, config=None):
            calls.append(model)
            if model == ai_service.PRIMARY_MODEL:
                raise FakeOverloadError("503 UNAVAILABLE. High demand.")
            return SimpleNamespace(parsed=None, text="next-model-ok")
        return SimpleNamespace(models=SimpleNamespace(generate_content=generate_content))

    monkeypatch.setattr(ai_service.genai, "Client", factory)
    monkeypatch.setenv("GOOGLE_API_KEY", "only-key")

    result = safe_generate_content("prompt")

    assert result == "next-model-ok"
    assert calls.count(ai_service.PRIMARY_MODEL) == 1   # no second attempt
    assert len(calls) == 2                              # primary once, then one backup


def test_timeout_error_skips_same_model_retry(monkeypatch):
    """A call hung past AI_CALL_TIMEOUT must be abandoned, not retried."""
    import requests

    class FakeTimeout(requests.exceptions.Timeout):
        pass

    calls = []

    def factory(api_key, **_kwargs):
        def generate_content(model, contents, config=None):
            calls.append(model)
            if model == ai_service.PRIMARY_MODEL:
                raise FakeTimeout("HTTPSConnectionPool: Read timed out.")
            return SimpleNamespace(parsed=None, text="backup-after-timeout")
        return SimpleNamespace(models=SimpleNamespace(generate_content=generate_content))

    monkeypatch.setattr(ai_service.genai, "Client", factory)
    monkeypatch.setenv("GOOGLE_API_KEY", "only-key")

    result = safe_generate_content("prompt")

    assert result == "backup-after-timeout"
    assert calls.count(ai_service.PRIMARY_MODEL) == 1   # hung call not retried


def test_all_models_overloaded_jumps_straight_to_groq(monkeypatch):
    """Google-side overload is model-global: key #2 must be SKIPPED and the
    chain must jump directly to the Groq fallback."""
    gemini_calls = []

    def factory(api_key, **_kwargs):
        def generate_content(model, contents, config=None):
            gemini_calls.append((api_key, model))
            raise FakeOverloadError("503 UNAVAILABLE. High demand.")
        return SimpleNamespace(models=SimpleNamespace(generate_content=generate_content))

    monkeypatch.setattr(ai_service.genai, "Client", factory)
    monkeypatch.setenv("GOOGLE_API_KEYS", "key1,key2")

    groq_calls = []
    _groq_factory(monkeypatch, payload={"reply": "from-groq"}, calls=groq_calls)
    monkeypatch.setenv("GROQ_API_KEY", "groq-key")

    result = safe_generate_content("prompt")

    assert result == json.dumps({"reply": "from-groq"})
    # Only key #1 was walked; key #2 never contacted (overload ≠ per-key).
    assert {k for k, _ in gemini_calls} == {"key1"}
    assert len(gemini_calls) == len([ai_service.PRIMARY_MODEL] + ai_service.BACKUP_MODELS)
    assert len(groq_calls) == 1


def test_groq_fallback_used_when_all_gemini_keys_fail(monkeypatch):
    # Every Gemini key quota-fails.
    monkeypatch.setattr(ai_service.genai, "Client", lambda api_key, **_kwargs: SimpleNamespace(
        models=SimpleNamespace(generate_content=lambda model, contents, config=None: (_ for _ in ()).throw(FakeQuotaError()))
    ))
    monkeypatch.setenv("GOOGLE_API_KEYS", "key1,key2")

    groq_calls = []
    _groq_factory(
        monkeypatch,
        payload={
            "structured_data": {"name": "headache", "severity": "mild"},
            "clinical_summary": "S: mild headache.",
        },
        calls=groq_calls,
    )
    monkeypatch.setenv("GROQ_API_KEY", "groq-key")

    result = safe_generate_content("transcript", IntakeOutput)

    assert isinstance(result, IntakeOutput)             # validated by pydantic
    assert result.structured_data.name == "headache"
    assert len(groq_calls) == 1
    # System prompt must carry the JSON schema so Groq mirrors the contract.
    assert "schema" in groq_calls[0]["messages"][0]["content"]


def test_groq_fallback_plain_text_without_schema(monkeypatch):
    monkeypatch.setattr(ai_service.genai, "Client", lambda api_key, **_kwargs: SimpleNamespace(
        models=SimpleNamespace(generate_content=lambda model, contents, config=None: (_ for _ in ()).throw(FakeQuotaError()))
    ))
    monkeypatch.setenv("GOOGLE_API_KEY", "only-key")
    _groq_factory(monkeypatch, payload={"reply": "hello"})
    monkeypatch.setenv("GROQ_API_KEY", "groq-key")

    result = safe_generate_content("hi")

    assert result == json.dumps({"reply": "hello"})  # raw text passthrough


# ── Layer 4: deterministic degradation ─────────────────────────────────────

def test_deterministic_fallback_when_all_providers_down(monkeypatch):
    monkeypatch.setattr(ai_service.genai, "Client", lambda api_key, **_kwargs: SimpleNamespace(
        models=SimpleNamespace(generate_content=lambda model, contents, config=None: (_ for _ in ()).throw(FakeQuotaError()))
    ))
    monkeypatch.setenv("GOOGLE_API_KEYS", "key1,key2")
    # GROQ_API_KEY stays empty (autouse fixture) → Groq fallback unavailable.

    result = safe_generate_content("transcript", IntakeOutput)

    assert isinstance(result, IntakeOutput)
    assert result.structured_data.name == "Patient Reported Symptoms"
    assert result.clinical_summary.startswith("S:")


def test_runtime_error_when_all_providers_down_without_schema(monkeypatch):
    monkeypatch.setattr(ai_service.genai, "Client", lambda api_key, **_kwargs: SimpleNamespace(
        models=SimpleNamespace(generate_content=lambda model, contents, config=None: (_ for _ in ()).throw(FakeQuotaError()))
    ))
    monkeypatch.setenv("GOOGLE_API_KEY", "only-key")

    with pytest.raises(RuntimeError):
        safe_generate_content("prompt")


def test_no_keys_configured_raises(monkeypatch):
    monkeypatch.setenv("GOOGLE_API_KEY", "")
    with pytest.raises(RuntimeError, match="GOOGLE_API_KEY"):
        safe_generate_content("prompt")