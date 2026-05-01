"""Triage service."""

# triage_detector.py

import re

# ---------------------------------
# 🚨 Red Flag Keywords & Phrases
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

# ---------------------------------
# 🚑 Urgency Detection Function
# ---------------------------------

def detect_urgent_red_flags(text: str) -> dict:
    """
    Returns:
        {
            "urgent": True/False,
            "matched_terms": [...]
        }
    """

    text = text.lower()
    matches = []

    for pattern in RED_FLAG_PATTERNS:
        if re.search(pattern, text):
            matches.append(pattern)

    return {
        "urgent": len(matches) > 0,
        "matched_terms": matches
    }