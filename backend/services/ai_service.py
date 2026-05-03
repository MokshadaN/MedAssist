"""AI service."""

import os
import time
from pathlib import Path
from typing import Any, List, Optional
from pydantic import BaseModel, Field
from google import genai
from google.genai import errors
from dotenv import load_dotenv

from utils.prompts import ai_reply_prompt, follow_up_prompt, intake_summary_prompt
from services.triage_service import detect_urgent_red_flags


# =====================================================
# CONFIG
# =====================================================

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")


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
                print(f"\n[INFO] Using model: {model_name} (Attempt {attempt + 1})")

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
                print(f"[ERROR] Error: {str(e)}")

                if attempt < MAX_RETRIES:
                    print(f"[WAIT] Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    wait_time *= 2  # exponential backoff
                else:
                    print("[FAIL] Max retries reached for this model.")
                    break

    raise RuntimeError("All models failed after retries.")


# =====================================================
# EXTRACTION + SUMMARY (1 CALL)
# =====================================================

def extract_and_summarize(transcript: str) -> IntakeOutput:
    return safe_generate_content(intake_summary_prompt(transcript), IntakeOutput)

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
