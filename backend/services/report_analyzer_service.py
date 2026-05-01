"""Gemini-based report analyzer for uploaded medical images."""

from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import errors


BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

SYSTEM_PROMPT = """
You are a clinical documentation assistant for physicians.

Extract data from the medical report into STRICT JSON.

Return ONLY valid JSON. No markdown. No explanations.

Structure EXACTLY as:

{
  "report_metadata": {
    "patient_id_redacted": boolean,
    "date_of_report": "string",
    "report_type": "Quantitative Lab Report or Qualitative Radiographic Study"
  },
  "detailed_metrics": [
    {
      "parameter": "string",
      "value": "string",
      "units": "string",
      "reference_range": "string",
      "interpretation": "Normal/High/Low",
      "severity": "Normal/Mild/Moderate/Severe"
    }
  ],
  "clinical_summary": {
    "abnormal_parameters": ["list only abnormal parameters"],
    "system_wise_grouping": {
      "RBC_related": "summary",
      "WBC_related": "summary",
      "Platelet_related": "summary",
      "Other": "summary"
    },
    "hematologic_pattern": "Describe overall CBC pattern without diagnosing",
    "critical_flags": ["list any clinically significant extreme deviations"],
    "internal_consistency_notes": "Mention any conflicting indices or missing values",
    "overall_clinical_snapshot": "Concise physician-ready paragraph summarizing major abnormalities without inferring causes."
  }
}

Rules:
1. Do NOT hallucinate.
2. If text is unreadable, write "unreadable".
3. Do NOT invent reference ranges.
4. Do NOT diagnose or suggest causes.
5. If a parameter is missing, state it in internal_consistency_notes.
"""

MODEL_NAME = "gemini-2.5-flash"
MAX_RETRIES = 2
INITIAL_WAIT = 2


def _get_client():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


def _extract_json(raw_text: str) -> dict[str, Any]:
    match = re.search(r"\{.*\}", raw_text, flags=re.S)
    payload = match.group(0) if match else raw_text
    return json.loads(payload)


def analyze_report_image(file_path: str | Path) -> dict[str, Any]:
    image_path = Path(file_path)
    if not image_path.exists():
        return {
            "status": "file_missing",
            "message": "Uploaded report could not be found on disk.",
        }

    client = _get_client()
    if client is None:
        return {
            "status": "unavailable",
            "message": "GOOGLE_API_KEY is not configured.",
        }

    uploaded_file = client.files.upload(file=str(image_path))

    wait_time = INITIAL_WAIT
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=[uploaded_file, SYSTEM_PROMPT],
            )
            raw_text = response.text or ""
            data = _extract_json(raw_text)
            return {
                "status": "analyzed",
                "source_file": image_path.name,
                "analysis": data,
                "raw_text": raw_text,
            }
        except errors.ClientError as exc:
            last_error = exc
            if "429" in str(exc) and attempt < MAX_RETRIES:
                time.sleep(wait_time)
                wait_time *= 2
                continue
            break
        except Exception as exc:
            last_error = exc
            break

    return {
        "status": "unavailable",
        "source_file": image_path.name,
        "message": f"Report analysis failed: {last_error}",
    }


def serialize_report_analysis(analysis: dict[str, Any]) -> str:
    return json.dumps(analysis, ensure_ascii=True)
