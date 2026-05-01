"""Triage service."""

import os
import re
import json
from groq import Groq
from dotenv import load_dotenv

# Reliably load .env from the backend directory
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

# ---------------------------------
# 🚨 Red Flag Keywords & Phrases (Backup)
# ---------------------------------

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
        "matched_terms": matches
    }


def _get_groq_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    return Groq(api_key=api_key)


def detect_urgent_red_flags(text: str) -> dict:
    """
    Uses Groq LLM to intelligently analyze text for medical emergencies.
    Falls back to regex if Groq API key is missing or call fails.
    
    Returns:
        {
            "urgent": True/False,
            "matched_terms": [...]
        }
    """
    client = _get_groq_client()
    
    if not client:
        print("⚠ GROQ_API_KEY missing. Using regex fallback for triage.")
        return _detect_urgent_red_flags_regex(text)

    prompt = f"""You are a medical triage AI. Analyze the patient transcript below to determine if this is a severe medical emergency requiring immediate attention (like a heart attack, stroke, severe bleeding, or extreme pain).
    
Transcript: "{text}"

Return a STRICT JSON object in this exact format:
{{
    "urgent": true or false,
    "matched_terms": ["list of concerning phrases from transcript, empty if none"]
}}
"""
    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You are a medical emergency detection JSON API. You MUST return strictly valid JSON and nothing else."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        
        response_json = completion.choices[0].message.content
        data = json.loads(response_json)
        
        return {
            "urgent": data.get("urgent", False),
            "matched_terms": data.get("matched_terms", [])
        }
        
    except Exception as e:
        print(f"⚠ Groq Triage API Error: {e}")
        # Fallback to regex if Groq API fails
        return _detect_urgent_red_flags_regex(text)