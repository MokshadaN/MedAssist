"""AI service."""

import os
import time
from typing import List, Optional
from pydantic import BaseModel, Field
from google import genai
from google.genai import errors
from dotenv import load_dotenv

from utils.prompts import follow_up_prompt
from utils.voice_engine import get_patient_input
from services.triage_service import detect_urgent_red_flags


# =====================================================
# CONFIG
# =====================================================

# Reliably load .env from the backend directory
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)


def _get_client():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)

PRIMARY_MODEL = "gemini-3-flash-preview"
BACKUP_MODEL = "gemini-2.5-flash"

MAX_RETRIES = 1          # 1 retry → total 2 attempts per model
INITIAL_WAIT = 2         # seconds


# =====================================================
# DATA MODELS
# =====================================================

class VisitData(BaseModel):
    name: Optional[str] = Field(description="Primary symptom or condition")
    severity: Optional[str] = Field(description="Severity level")
    duration: Optional[str] = Field(description="Duration")
    trend: Optional[str] = Field(description="Progression")
    frequency: Optional[str] = Field(description="Frequency")
    triggers: List[str] = Field(default_factory=list)
    relievers: List[str] = Field(default_factory=list)
    impact: List[str] = Field(default_factory=list)
    confidence: Optional[str] = None
    red_flag: Optional[bool] = False


class IntakeOutput(BaseModel):
    structured_data: VisitData
    clinical_summary: str


# =====================================================
# SAFE LLM CALL WITH RETRY + MODEL FALLBACK
# =====================================================

def safe_generate_content(contents, schema=None):
    client = _get_client()
    if client is None:
        raise RuntimeError("GOOGLE_API_KEY is not configured")

    models_to_try = [PRIMARY_MODEL, BACKUP_MODEL]

    for model_name in models_to_try:

        wait_time = INITIAL_WAIT

        for attempt in range(MAX_RETRIES + 1):
            try:
                print(f"\n🔹 Using model: {model_name} (Attempt {attempt + 1})")

                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": schema
                    } if schema else None
                )

                return response.parsed if schema else response.text

            except errors.ClientError as e:
                print(f"⚠ Error: {str(e)}")

                if attempt < MAX_RETRIES:
                    print(f"⏳ Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    wait_time *= 2  # exponential backoff
                else:
                    print("❌ Max retries reached for this model.")
                    break

    raise RuntimeError("All models failed after retries.")


# =====================================================
# EXTRACTION + SUMMARY (1 CALL)
# =====================================================

def extract_and_summarize(transcript: str) -> IntakeOutput:

    combined_prompt = f"""
You are a clinical intake assistant.

From the transcript below:

1. Extract structured clinical data.
2. Generate a physician-ready SOAP note.

Return STRICT JSON in this format:

{{
  "structured_data": {{
      "name": "",
      "severity": "",
      "duration": "",
      "trend": "",
      "frequency": "",
      "triggers": [],
      "relievers": [],
      "impact": [],
      "confidence": "",
      "red_flag": false
  }},
  "clinical_summary": "SOAP formatted note"
}}

SOAP FORMAT REQUIREMENTS:

S (Subjective):
- Patient-reported symptoms
- Onset
- Severity
- Triggers
- Relievers
- Impact

O (Objective):
- Only include explicitly stated observable/measurable data
- If none: write 'No objective data available from intake.'

A (Assessment):
- Clinical impression based strictly on reported symptoms
- No definitive diagnosis
- No prescriptions

P (Plan):
- Suggested next evaluation steps
- No medications

STRICT RULES:
- No diagnosis
- No hallucination
- Only use transcript information

Transcript:
{transcript}
"""
    return safe_generate_content(combined_prompt, IntakeOutput)

# =====================================================
# FOLLOW-UP GENERATION
# =====================================================

def generate_combined_followup(missing_fields, transcript, data):

    prompt = follow_up_prompt(missing_fields, data, transcript)

    return safe_generate_content(prompt)


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
    # simple placeholder logic
    return f"AI says: I understand '{user_message}'"