"""Triage service."""

import json
import os
import re

from dotenv import load_dotenv
from groq import Groq
from sqlalchemy.orm import Session

from services.patient_service import get_patient_by_user_id
from services.places_service import get_nearby_hospitals_for_address
from utils.prompts import TRIAGE_SYSTEM_PROMPT, triage_prompt

# Reliably load .env from the backend directory.
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

RED_FLAG_PATTERNS = [
    # Chest / cardiac
    r"chest pain",
    r"crushing chest pain",
    r"pressure in chest",
    r"radiating pain",
    r"left arm pain",
    # Breathing
    r"shortness of breath",
    r"can't breathe",
    r"difficulty breathing",
    r"gasping",
    # Neurological
    r"slurred speech",
    r"confused",
    r"unconscious",
    r"passed out",
    r"seizure",
    r"paralyzed",
    r"numbness on one side",
    # Severe bleeding / trauma
    r"heavy bleeding",
    r"won't stop bleeding",
    r"vomiting blood",
    r"blood in stool",
    r"severe head injury",
    # Severe pain
    r"worst pain of my life",
    r"10/10 pain",
    r"extreme pain",
    r"sudden severe",
    # Infection / emergency
    r"high fever",
    r"104",
    r"stiff neck",
    r"severe dehydration",
    # Cardiac collapse indicators
    r"fainting",
    r"collapse",
    r"heart racing",
]


def _detect_urgent_red_flags_regex(text: str) -> dict:
    """Fallback hardcoded regex check."""
    text = text.lower()
    matches = []
    for pattern in RED_FLAG_PATTERNS:
        if re.search(pattern, text):
            matches.append(pattern)

    return {
        "urgent": len(matches) > 0,
        "matched_terms": matches,
    }


def _get_groq_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    return Groq(api_key=api_key)


def detect_urgent_red_flags(text: str, user_id: str | None = None, db: Session | None = None) -> dict:
    """
    Analyze text for medical emergency red flags.

    Uses Groq when configured, falls back to regex, and attaches nearby hospital
    information when urgent red flags are found and patient address is available.
    """
    client = _get_groq_client()

    if not client:
        print("Warning: GROQ_API_KEY missing. Using regex fallback for triage.")
        result = _detect_urgent_red_flags_regex(text)
    else:
        try:
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": TRIAGE_SYSTEM_PROMPT},
                    {"role": "user", "content": triage_prompt(text)},
                ],
                temperature=0.0,
                response_format={"type": "json_object"},
            )

            response_json = completion.choices[0].message.content
            data = json.loads(response_json)
            result = {
                "urgent": data.get("urgent", False),
                "matched_terms": data.get("matched_terms", []),
            }
        except Exception as exc:
            print(f"Warning: Groq triage API error: {exc}")
            result = _detect_urgent_red_flags_regex(text)

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
        print(f"Warning: error fetching hospital data: {exc}")
        result["nearest_hospitals"] = []
        result["emergency_message"] = (
            "Medical emergency detected. Hospital lookup failed; call emergency services immediately."
        )

    return result


