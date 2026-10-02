"""AI service."""

import json
import logging
import os
import threading
import time
from pathlib import Path
from typing import Any, List, Optional
from pydantic import BaseModel, Field
from google import genai
from groq import Groq
from dotenv import load_dotenv
from requests import exceptions as requests_exceptions

from utils.prompts import ai_reply_prompt, follow_up_prompt, intake_summary_prompt
from services.triage_service import detect_urgent_red_flags
from core.circuit_breaker import CircuitBreaker, CircuitBreakerError, groq_breaker

logger = logging.getLogger(__name__)


# =====================================================
# CONFIG
# =====================================================

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

PRIMARY_MODEL = "gemini-3.8-flash"
# Older generations first: the newest flash is often in a global demand
# spike (503 "high demand"), and gemini-flash-latest is an alias for the
# SAME newest model — so backups must be genuinely different models.
BACKUP_MODELS = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"]

MAX_RETRIES = 1          # 1 retry → total 2 attempts per model
INITIAL_WAIT = 1         # seconds
MAX_API_KEYS = 5         # hard cap on rotated keys

# Hard cap on a single AI call (seconds). A model that neither answers nor
# errors within this window (hung connection / demand-stalled server) is
# abandoned for the next one — clinical flows must not stall on hangs.
AI_CALL_TIMEOUT = int(os.getenv("AI_CALL_TIMEOUT", "40"))

# Cross-provider fallback model (independent key/quota from Gemini).
# gpt-oss-120b is the strongest text model currently on Groq's free tier.
# Reuses GROQ_API_KEY; override via GROQ_FALLBACK_MODEL if it changes.
GROQ_FALLBACK_MODEL = os.getenv("GROQ_FALLBACK_MODEL", "openai/gpt-oss-120b")


def _get_api_keys() -> List[str]:
    """
    Gemini API keys in priority order.

    Supports GOOGLE_API_KEYS (comma-separated — one key per Google Cloud
    project so each key has its own free-tier quota) and falls back to the
    single GOOGLE_API_KEY for backward compatibility.
    """
    multi = os.getenv("GOOGLE_API_KEYS", "")
    keys = [k.strip() for k in multi.split(",") if k.strip()]
    if keys:
        return keys[:MAX_API_KEYS]
    single = os.getenv("GOOGLE_API_KEY", "").strip()
    return [single] if single else []


# One circuit breaker per API key: an exhausted or dead key must not block
# healthy keys. Breakers are created lazily (keys are read from the env at
# call time) and the dict is lock-guarded for thread safety.
_gemini_key_breakers: dict = {}
_breakers_lock = threading.Lock()


def _breaker_for_key(key_index: int) -> CircuitBreaker:
    with _breakers_lock:
        if key_index not in _gemini_key_breakers:
            _gemini_key_breakers[key_index] = CircuitBreaker(
                failure_threshold=5,
                recovery_timeout=60,
                name=f"Gemini-key-{key_index + 1}",
                expected_exception=Exception,
            )
        return _gemini_key_breakers[key_index]


def _is_quota_error(exc: Exception) -> bool:
    """True when the failure is quota/rate-limit exhaustion — rotation helps."""
    code = getattr(exc, "code", None)
    status = (getattr(exc, "status", None) or "").upper()
    text = str(exc).upper()
    return (
        code == 429
        or "RESOURCE_EXHAUSTED" in status
        or "RESOURCE_EXHAUSTED" in text
        or "QUOTA" in text
    )


def _is_overloaded_error(exc: Exception) -> bool:
    """
    True when the provider itself is refusing or stalling for capacity
    reasons: a 503 UNAVAILABLE / "high demand" response, or a hung call
    that hit the per-call timeout. Retrying the SAME model immediately
    cannot help in either case — the chain moves to the next model.
    """
    code = getattr(exc, "code", None)
    status = (getattr(exc, "status", None) or "").upper()
    text = str(exc).upper()
    if code == 503 or "UNAVAILABLE" in status or "HIGH DEMAND" in text:
        return True
    # requests raises its Timeout family when AI_CALL_TIMEOUT fires (the
    # genai SDK propagates it); httpx names kept for future-proofing.
    if isinstance(exc, requests_exceptions.Timeout):
        return True
    return type(exc).__name__ in {"APITimeoutError", "TimeoutException"}


# =====================================================
# DATA MODELS
# =====================================================

class VisitData(BaseModel):
    name: Optional[str] = Field(default=None, description="Primary symptom or condition")
    severity: Optional[str] = Field(default=None, description="Severity level")
    duration: Optional[str] = Field(default=None, description="Duration")
    trend: Optional[str] = Field(default=None, description="Progression")
    frequency: Optional[str] = Field(default=None, description="Frequency")
    triggers: List[str] = Field(default_factory=list)
    relievers: List[str] = Field(default_factory=list)
    impact: List[str] = Field(default_factory=list)
    confidence: Optional[str] = None
    red_flag: Optional[bool] = False


class IntakeOutput(BaseModel):
    structured_data: VisitData
    clinical_summary: str


# =====================================================
# CROSS-PROVIDER FALLBACK (GROQ)
# =====================================================

def _groq_fallback_generate(contents, schema=None):
    """
    Last-resort provider: Groq — independent API key, quota and outage
    domain from Gemini. Mirrors the Gemini contract: JSON mode output,
    validated against the same pydantic schema when one is supplied.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")
    if groq_breaker.opened:
        raise RuntimeError("Groq circuit breaker is OPEN")

    if schema:
        system = (
            "You are a clinical documentation assistant. "
            "Respond ONLY with a single valid JSON object — no markdown, no extra text. "
            "The JSON object must match this schema exactly:\n"
            + json.dumps(schema.model_json_schema())
        )
    else:
        system = (
            "You are a clinical documentation assistant. "
            "Respond with a concise, direct answer — plain text, no JSON, no markdown."
        )

    @groq_breaker
    def _call():
        kwargs = {
            "model": GROQ_FALLBACK_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": contents},
            ],
            "temperature": 0.2,
        }
        if schema:
            # Structured extraction — enforce JSON mode and validate below.
            kwargs["response_format"] = {"type": "json_object"}
        return Groq(api_key=api_key, timeout=AI_CALL_TIMEOUT).chat.completions.create(**kwargs)

    completion = _call()
    text = completion.choices[0].message.content or ""
    if schema:
        return schema.model_validate(json.loads(text))
    return text


# =====================================================
# SAFE LLM CALL — KEY ROTATION + MODEL FALLBACK + PROVIDER FALLBACK
# =====================================================

def safe_generate_content(contents, schema=None):
    """
    Call Gemini with a layered resilience chain:

    1. API-key rotation — GOOGLE_API_KEYS (comma-separated; one key per
       Google Cloud project gives each key its own free-tier quota). A
       quota error (429 / RESOURCE_EXHAUSTED) rotates to the next key
       immediately, because all models under one key share that quota.
    2. Model fallback — primary + backup models with retry/backoff for
       transient errors (single-model hiccups). Overloaded models (503
       "high demand") and calls hung past AI_CALL_TIMEOUT are NOT retried
       — the next model is tried immediately.
    3. Provider fallback — Groq (separate key + quota) when every Gemini
       key/model is unavailable. If ALL models failed with overload (a
       Google-side capacity problem) the remaining keys are skipped too —
       a second key cannot fix Google's servers.
    4. Deterministic fallback — default IntakeOutput for intake extraction
       so the patient flow never hard-crashes.

    Each API key has its OWN circuit breaker (5 failures / 60s recovery),
    so an exhausted key fails fast without blocking healthy keys.
    """
    api_keys = _get_api_keys()
    if not api_keys:
        raise RuntimeError("GOOGLE_API_KEY is not configured")

    models_to_try = [PRIMARY_MODEL] + BACKUP_MODELS

    for key_index, api_key in enumerate(api_keys):
        breaker = _breaker_for_key(key_index)
        if breaker.opened:
            logger.warning(
                "Skipping Gemini API key #%d — circuit breaker is OPEN.", key_index + 1
            )
            continue

        # Hard per-call timeout (http_options is in MILLISECONDS): a model
        # that neither answers nor errors within AI_CALL_TIMEOUT seconds
        # is abandoned for the next one — clinical flows must not stall.
        client = genai.Client(
            api_key=api_key,
            http_options={"timeout": AI_CALL_TIMEOUT * 1000},
        )
        rotate_key = False
        # Overload is a Google-side condition. If every model on this key
        # fails ONLY with overload/timeout, other keys cannot help either —
        # the chain will jump straight to the Groq fallback.
        only_overload_failures = True

        for model_name in models_to_try:
            if rotate_key:
                break
            wait_time = INITIAL_WAIT

            for attempt in range(MAX_RETRIES + 1):
                try:
                    logger.info(
                        "Using model: %s with API key #%d (attempt %d)",
                        model_name, key_index + 1, attempt + 1,
                    )

                    @breaker
                    def _call():
                        return client.models.generate_content(
                            model=model_name,
                            contents=contents,
                            config={
                                "response_mime_type": "application/json",
                                "response_schema": schema
                            } if schema else None
                        )

                    response = _call()
                    return response.parsed if schema else response.text

                except CircuitBreakerError:
                    logger.error("Circuit breaker OPEN for Gemini API key #%d.", key_index + 1)
                    rotate_key = True
                    only_overload_failures = False
                    break

                except Exception as e:
                    logger.warning(
                        "Error on model %s with key #%d (attempt %d): %s",
                        model_name, key_index + 1, attempt + 1, e,
                    )

                    if _is_quota_error(e):
                        # Quota is per key/project and shared by ALL models —
                        # trying other models on this key cannot succeed.
                        logger.warning(
                            "Quota exhausted for Gemini API key #%d — rotating to next key.",
                            key_index + 1,
                        )
                        rotate_key = True
                        only_overload_failures = False
                        break

                    if _is_overloaded_error(e):
                        # The model itself said "high demand" (or hung until
                        # the per-call timeout fired): retrying it right now
                        # just burns more seconds — move on immediately.
                        logger.warning(
                            "Model %s is overloaded or timed out — trying the next model immediately.",
                            model_name,
                        )
                        break

                    only_overload_failures = False

                    if attempt < MAX_RETRIES:
                        logger.info("Retrying in %ds...", wait_time)
                        time.sleep(wait_time)
                        wait_time *= 2
                    else:
                        logger.warning("Moving to next fallback model after failures on %s", model_name)
                        break

        if only_overload_failures:
            # Every model said "high demand" (or timed out): this is Google
            # capacity, not a per-key problem — skip the remaining keys.
            logger.warning(
                "All Gemini models overloaded/timed out — skipping remaining keys, "
                "jumping to the Groq fallback provider."
            )
            break

    # ── Layer 3: cross-provider fallback (independent quota/outage domain) ──
    try:
        logger.warning("All Gemini keys/models failed — trying Groq fallback provider.")
        return _groq_fallback_generate(contents, schema)
    except Exception as e:
        logger.warning("Groq fallback unavailable: %s", e)

    # ── Layer 4: deterministic in-process fallback ──────────────────────────
    # If all providers fail (quota + outage), return fallback schema object
    if schema == IntakeOutput:
        logger.warning("Generating default IntakeOutput fallback due to upstream AI service downtime.")
        return IntakeOutput(
            structured_data=VisitData(name="Patient Reported Symptoms", severity="Moderate"),
            clinical_summary="S: Patient completed intake questions.\nO: Intake submitted via portal.\nA: Symptoms recorded.\nP: Clinical review scheduled."
        )

    raise RuntimeError("AI model service temporarily busy. Please try again shortly.")


# =====================================================
# EXTRACTION + SUMMARY (1 CALL)
# =====================================================

def extract_and_summarize(transcript: str) -> IntakeOutput:
    return safe_generate_content(intake_summary_prompt(transcript), IntakeOutput)

# =====================================================
# FOLLOW-UP GENERATION
# =====================================================

# Deterministic fallback labels — used when the AI provider is unavailable so
# the intake flow degrades gracefully instead of crashing (provider outage /
# rate limit / circuit breaker OPEN).
FALLBACK_FOLLOWUP_LABELS = {
    "name": "your main symptom",
    "severity": "how severe it feels (mild, moderate, or severe)",
    "duration": "when the problem started",
    "trend": "whether it is getting better, worse, or staying the same",
    "frequency": "how often it happens",
    "triggers": "what makes it worse",
    "relievers": "anything that helps relieve it",
    "impact": "how it affects your daily activities",
}


def _fallback_followup_question(missing_fields: List[str]) -> str:
    fragments = [FALLBACK_FOLLOWUP_LABELS.get(field, field.replace("_", " ")) for field in missing_fields]
    return "To complete your medical record, could you briefly describe " + ", ".join(fragments) + "?"


def generate_combined_followup(missing_fields, transcript, data):

    prompt = follow_up_prompt(missing_fields, data, transcript)

    try:
        return safe_generate_content(prompt)
    except RuntimeError:
        logger.warning(
            "AI provider unavailable for follow-up generation — using deterministic "
            "fallback question for missing fields: %s",
            missing_fields,
        )
        return _fallback_followup_question(missing_fields)


# =====================================================
# FIND MISSING FIELDS
# =====================================================

def find_missing_fields(data: VisitData):

    missing = []
    d = data.model_dump()

    for field, value in d.items():

        if field in ["confidence", "red_flag"]:
            continue

        if value is None:
            missing.append(field)
        elif isinstance(value, str) and value.strip() == "":
            missing.append(field)
        elif isinstance(value, list) and len(value) == 0:
            missing.append(field)

    return missing


# =====================================================
# PREVIOUS VISIT COMPARISON (NO LLM)
# =====================================================

def compare_with_previous_visit(
    current_structured: dict[str, Any],
    previous_structured: dict[str, Any] | None,
) -> dict[str, Any]:
    if not previous_structured:
        return {
            "status": "no_previous_visit",
            "changes": [],
            "summary": "No previous visit available.",
        }

    previous_symptoms = set(previous_structured.get("symptoms") or [])
    current_symptoms = set(current_structured.get("symptoms") or [])

    if current_structured.get("name"):
        current_symptoms.add(current_structured["name"])
    if previous_structured.get("name"):
        previous_symptoms.add(previous_structured["name"])

    added = sorted(current_symptoms - previous_symptoms)
    removed = sorted(previous_symptoms - current_symptoms)

    changes: list[str] = []
    if added:
        changes.append(f"New symptoms: {', '.join(added)}")
    if removed:
        changes.append(f"Resolved symptoms: {', '.join(removed)}")

    prev_severity = previous_structured.get("severity")
    curr_severity = current_structured.get("severity")
    if prev_severity and curr_severity and prev_severity != curr_severity:
        changes.append(f"Severity changed from {prev_severity} to {curr_severity}")

    if not changes:
        changes.append("No major change detected from previous visit.")

    return {
        "status": "compared",
        "changes": changes,
        "summary": " | ".join(changes),
    }


# =====================================================
def analyze_patient_transcript(transcript: str) -> dict:
    """Analyzes a patient transcript, checking for red flags, missing fields, or returning a full SOAP summary."""
    # 🚨 RED FLAG CHECK
    triage_result = detect_urgent_red_flags(transcript)

    if triage_result["urgent"]:
        return {
            "status": "urgent",
            "matched_terms": triage_result["matched_terms"],
            "message": "Immediate medical evaluation recommended."
        }

    # 🔍 Analyzing...
    try:
        result = extract_and_summarize(transcript)
    except RuntimeError as exc:
        return {
            "status": "unavailable",
            "message": str(exc),
        }

    data = result.structured_data
    missing = find_missing_fields(data)

    # -------------------------------------------------
    # FOLLOW-UP IF NEEDED
    # -------------------------------------------------
    if missing:
        followup_q = generate_combined_followup(missing, transcript, data)
        return {
            "status": "needs_clarification",
            "missing_fields": missing,
            "followup_question": followup_q
        }

    # -------------------------------------------------
    # FINAL OUTPUT
    # -------------------------------------------------
    return {
        "status": "complete",
        "clinical_summary": result.clinical_summary,
        "structured_data": data.model_dump()
    }

def generate_ai_reply(user_message: str):
    try:
        reply = safe_generate_content(ai_reply_prompt(user_message))
        return reply if isinstance(reply, str) else str(reply)
    except RuntimeError:
        return "AI responses are unavailable until GOOGLE_API_KEY is configured."
