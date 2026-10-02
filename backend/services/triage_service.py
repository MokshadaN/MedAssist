"""Triage service."""

import json
import logging
import os
import re

from dotenv import load_dotenv
from groq import Groq
from pydantic import ValidationError
from sqlalchemy.orm import Session

from schemas.triage import TriageExtraction
from services.clinical_triage_classifier import run_shadow_classification
from services.patient_service import get_patient_by_user_id
from services.places_service import get_nearby_hospitals_for_address
from utils.prompts import TRIAGE_SYSTEM_PROMPT, triage_prompt
from core.circuit_breaker import groq_breaker, CircuitBreakerError

# Reliably load .env from the backend directory.
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

logger = logging.getLogger(__name__)

POLICY_VERSION = "triage-v3-semantic-extraction-policy"

RED_FLAG_RULES = [
    # Chest / cardiac
    ("chest_pain", r"\b(?:crushing\s+)?chest pain\b"),
    ("chest_pressure", r"\bpressure in (?:my |the )?chest\b"),
    ("radiating_pain", r"\bradiating pain\b"),
    ("left_arm_pain", r"\bleft arm pain\b"),
    # Breathing
    ("shortness_of_breath", r"\bshortness of breath\b"),
    ("cannot_breathe", r"\b(?:can't|cannot|can not) breathe\b"),
    ("difficulty_breathing", r"\bdifficulty breathing\b"),
    ("gasping", r"\bgasping\b"),
    # Neurological
    ("slurred_speech", r"\bslurred speech\b"),
    ("confusion", r"\bconfused\b"),
    ("unconscious", r"\bunconscious\b"),
    ("passed_out", r"\bpassed out\b"),
    ("seizure", r"\bseizure\b"),
    ("paralysis", r"\bparalyzed\b"),
    ("one_sided_numbness", r"\bnumbness on one side\b"),
    # Severe bleeding / trauma
    ("heavy_bleeding", r"\bheavy bleeding\b"),
    ("uncontrolled_bleeding", r"\b(?:won't|will not) stop bleeding\b"),
    ("vomiting_blood", r"\bvomit(?:ing|ed)? blood\b"),
    ("coughing_blood", r"\bcough(?:ing|ed)?(?: up)? blood\b"),
    ("hemoptysis", r"\bhemoptysis\b"),
    ("blood_in_sputum", r"\bblood in (?:my |the )?sputum\b"),
    ("bloody_sputum", r"\bbloody sputum\b"),
    ("blood_in_stool", r"\bblood in (?:my |the )?stool\b"),
    ("severe_head_injury", r"\bsevere head injury\b"),
    # Severe pain
    ("worst_ever_pain", r"\bworst pain of my life\b"),
    ("ten_out_of_ten_pain", r"\b10/10 pain\b"),
    ("extreme_pain", r"\bextreme pain\b"),
    ("sudden_severe_symptom", r"\bsudden severe\b"),
    # Infection / emergency
    ("high_fever", r"\bhigh fever\b"),
    ("fever_104", r"\b104(?:\s*°?\s*f)?\b"),
    ("stiff_neck", r"\bstiff neck\b"),
    ("severe_dehydration", r"\bsevere dehydration\b"),
    # Cardiac collapse indicators
    ("fainting", r"\bfainting\b"),
    ("collapse", r"\bcollapse\b"),
    ("heart_racing", r"\bheart racing\b"),
]

_NEGATION = re.compile(
    r"\b(?:no|not|never|without|den(?:y|ies|ied)|"
    r"isn't|aren't|wasn't|weren't|don't|doesn't|didn't)\b",
    re.IGNORECASE,
)
_CHEST_COMBINATION = re.compile(
    r"\b(?:chest (?:pain|pressure|tightness|discomfort))\b",
    re.IGNORECASE,
)
_ARM_HAND_COMBINATION = re.compile(
    r"\b(?:(?:left|right)\s+)?(?:arm|hand)"
    r"(?:\s+is)?\s+(?:pain|painful|hurts?|hurt|hurting|ache|aching)\b",
    re.IGNORECASE,
)


def _is_negated(text: str, match_start: int) -> bool:
    """Check a short same-clause window before a symptom mention."""
    prefix = text[max(0, match_start - 80):match_start]
    clause = re.split(r"[.!?;,\n]|\bbut\b|\bhowever\b", prefix)[-1]
    words = re.findall(r"\b[\w']+\b", clause)
    short_window = " ".join(words[-6:])
    return bool(_NEGATION.search(short_window))


def _positive_matches(pattern: re.Pattern[str], text: str) -> list[re.Match[str]]:
    return [
        match
        for match in pattern.finditer(text)
        if not _is_negated(text, match.start())
    ]


def _detect_emergency_rules(text: str) -> dict | None:
    """Return an emergency result when a non-negated deterministic rule matches."""
    normalized = text.lower()
    matched_terms: list[str] = []
    matched_rules: list[str] = []
    for rule_name, pattern_text in RED_FLAG_RULES:
        pattern = re.compile(pattern_text, re.IGNORECASE)
        for match in _positive_matches(pattern, normalized):
            matched_rules.append(rule_name)
            matched_terms.append(match.group(0))

    chest_matches = _positive_matches(_CHEST_COMBINATION, normalized)
    limb_matches = _positive_matches(_ARM_HAND_COMBINATION, normalized)
    if chest_matches and limb_matches:
        matched_rules.append("chest_with_arm_or_hand_pain")
        matched_terms.extend([chest_matches[0].group(0), limb_matches[0].group(0)])

    if not matched_rules:
        return None

    return {
        "urgent": True,
        "level": "emergency",
        "reason": "A deterministic emergency rule matched the patient's current symptoms.",
        "matched_terms": list(dict.fromkeys(matched_terms)),
        "matched_rules": list(dict.fromkeys(matched_rules)),
        "confidence": None,
        "decision_source": "rule",
        "review_required": False,
        "model_version": None,
        "policy_version": POLICY_VERSION,
    }


def _abstain_result(
    *,
    decision_source: str,
    model_version: str | None = None,
) -> dict:
    return {
        "urgent": False,
        "level": "abstain",
        "reason": (
            "Automatic urgency could not be determined safely; "
            "professional review is recommended."
        ),
        "matched_terms": [],
        "matched_rules": [],
        "confidence": None,
        "decision_source": decision_source,
        "review_required": True,
        "model_version": model_version,
        "policy_version": POLICY_VERSION,
    }


def _detect_extracted_emergency(
    extracted_facts: TriageExtraction,
    model_version: str,
) -> dict | None:
    """
    Escalate standardized, explicitly present safety concepts.

    The model extracts meaning only; this fixed policy owns the decision.
    Absence of a concept never means routine or safe.
    """
    concepts = list(dict.fromkeys(extracted_facts.present_safety_concepts))
    if not concepts:
        return None

    return {
        "urgent": True,
        "level": "emergency",
        "reason": (
            "A standardized safety concept extracted from the patient's "
            "current symptoms matched the emergency escalation policy."
        ),
        "matched_terms": [],
        "matched_rules": [f"semantic:{concept}" for concept in concepts],
        "confidence": None,
        "decision_source": "extracted_fact_rule",
        "review_required": False,
        "model_version": model_version,
        "policy_version": POLICY_VERSION,
    }


def _get_groq_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    return Groq(api_key=api_key)


def _get_triage_models() -> list[str]:
    """Return a small, de-duplicated extraction-model fallback chain."""
    configured = os.getenv("GROQ_TRIAGE_MODELS", "")
    if configured.strip():
        candidates = configured.split(",")
    else:
        candidates = [
            os.getenv("GROQ_MODEL", "openai/gpt-oss-20b"),
            os.getenv("GROQ_FALLBACK_MODEL", "openai/gpt-oss-120b"),
        ]

    models: list[str] = []
    for candidate in candidates:
        model = candidate.strip()
        if model and model not in models:
            models.append(model)
    return models[:3]


def _extract_facts(client, model: str, text: str) -> TriageExtraction:
    """Extract and validate patient-stated facts without assigning urgency."""
    @groq_breaker
    def _call():
        return client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": TRIAGE_SYSTEM_PROMPT},
                {"role": "user", "content": triage_prompt(text)},
            ],
            temperature=0.0,
            response_format={"type": "json_object"},
        )

    completion = _call()
    response_json = completion.choices[0].message.content
    return TriageExtraction.model_validate(json.loads(response_json))


def detect_urgent_red_flags(text: str, user_id: str | None = None, db: Session | None = None) -> dict:
    """
    Analyze text for medical emergency red flags.

    Runs raw-text rules first, then extraction-only models plus a fixed semantic
    escalation policy. Hospital information is attached only for emergencies.
    """
    emergency = _detect_emergency_rules(text)
    if emergency:
        return _attach_nearby_hospitals(emergency, user_id, db)

    client = _get_groq_client()
    if not client or groq_breaker.opened:
        if groq_breaker.opened:
            logger.warning("Groq API circuit breaker is OPEN — triage requires review.")
        else:
            logger.warning("GROQ_API_KEY missing — triage requires review.")
        result = _abstain_result(decision_source="fallback")
    else:
        extracted_facts = None
        successful_model = None
        for model in _get_triage_models():
            try:
                extracted_facts = _extract_facts(client, model, text)
                successful_model = model
                break
            except CircuitBreakerError:
                logger.error("Groq circuit breaker OPEN — triage requires review.")
                break
            except (json.JSONDecodeError, ValidationError, TypeError, AttributeError):
                logger.warning(
                    "Triage extraction output from model %s was invalid; trying fallback.",
                    model,
                )
            except Exception as exc:
                logger.warning(
                    "Groq triage extraction model %s failed (%s); trying fallback.",
                    model,
                    type(exc).__name__,
                )

        if extracted_facts is not None and successful_model is not None:
            semantic_emergency = _detect_extracted_emergency(
                extracted_facts,
                successful_model,
            )
            if semantic_emergency:
                result = semantic_emergency
            else:
                shadow = run_shadow_classification(text, extracted_facts)
                # Absence of an extracted safety concept is not evidence that a
                # patient is safe. Without a validated classifier, abstain.
                result = _abstain_result(
                    decision_source="extraction_only",
                    model_version=successful_model,
                )
                result["shadow_classifier_status"] = shadow.status
                result["shadow_model_version"] = shadow.model_version
        else:
            result = _abstain_result(decision_source="fallback")

    return _attach_nearby_hospitals(result, user_id, db)


def _attach_nearby_hospitals(result: dict, user_id: str | None, db: Session | None) -> dict:
    if not result.get("urgent") or not user_id or not db:
        return result

    try:
        patient = get_patient_by_user_id(db, user_id)
        if not patient or not patient.address:
            result["emergency_message"] = (
                "Medical emergency detected. Add the patient address to locate nearby hospitals."
            )
            result["nearest_hospitals"] = []
            return result

        hospitals = get_nearby_hospitals_for_address(patient.address, radius=10000)
        result["nearest_hospitals"] = [
            {
                "name": hospital.name,
                "phone": hospital.phone,
                "address": hospital.vicinity,
                "distance_meters": hospital.distance_meters,
                "opening_hours": hospital.opening_hours,
                "is_open": hospital.is_open,
            }
            for hospital in hospitals[:3]
        ]
        result["emergency_message"] = (
            "Medical emergency detected. Call emergency services or the nearest hospital immediately."
        )
    except Exception as exc:
        logger.warning("Error fetching hospital data: %s", exc)
        result["nearest_hospitals"] = []
        result["emergency_message"] = (
            "Medical emergency detected. Hospital lookup failed; call emergency services immediately."
        )

    return result


