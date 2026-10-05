"""Gemini-based report analyzer for uploaded medical reports."""

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
You are an expert clinical documentation assistant for physicians and hospital systems.

Extract ALL clinically important information from this medical report/document into STRICT JSON.

Return ONLY valid JSON. No markdown fences. No preamble. No explanations.

Structure EXACTLY as:

{
  "report_metadata": {
    "patient_name": "string",
    "dob": "string",
    "mrn": "string",
    "date_of_report": "string",
    "facility": "string",
    "report_type": "Quantitative Lab Report | Hospital Discharge Summary | Clinical Prescription | Diagnostic Study"
  },
  "diagnoses": [
    {
      "condition": "string",
      "icd_10": "string",
      "status": "Primary | Secondary | Resolved | Chronic"
    }
  ],
  "medications": [
    {
      "name": "string",
      "dosage": "string",
      "frequency": "string",
      "route": "string",
      "instructions": "string"
    }
  ],
  "detailed_metrics": [
    {
      "parameter": "string",
      "value": "string",
      "units": "string",
      "reference_range": "string",
      "interpretation": "Normal | High | Low | Abnormal",
      "severity": "Normal | Mild | Moderate | Severe"
    }
  ],
  "procedures": [
    {
      "name": "string",
      "code": "string"
    }
  ],
  "physician_notes": "string summarizing hospital course, clinical progress, or physician instructions",
  "clinical_summary": {
    "abnormal_parameters": ["list only abnormal parameters/findings"],
    "system_wise_grouping": {
      "RBC_related": "summary if applicable",
      "WBC_related": "summary if applicable",
      "Platelet_related": "summary if applicable",
      "Other": "summary if applicable"
    },
    "hematologic_pattern": "Describe overall hematologic/metabolic pattern without diagnosing",
    "critical_flags": ["list any critical or urgent findings"],
    "internal_consistency_notes": "Mention any missing values, blur, or conflicting indices",
    "overall_clinical_snapshot": "Concise physician-ready summary paragraph of major findings without inferring unstated causes."
  }
}

Rules:
1. Do NOT hallucinate. Only extract what is legibly stated in the document.
2. If text is unreadable or blurred, note it in internal_consistency_notes.
3. If an entire section does not apply (e.g. no medications in a pure lab panel, or no lab values in a prescription), return an empty list [] for that key.
4. Normalize medication names, dosages, and diagnostic codes faithfully.
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


def _build_physician_readable_output(data: dict[str, Any]) -> str:
    output_buffer: list[str] = []

    meta = data.get("report_metadata", {})
    output_buffer.append("=== REPORT METADATA ===")
    if meta.get("patient_name"):
        output_buffer.append(f"Patient: {meta.get('patient_name')} (DOB: {meta.get('dob', 'N/A')}, MRN: {meta.get('mrn', 'N/A')})")
    if meta.get("facility"):
        output_buffer.append(f"Facility: {meta.get('facility')}")
    output_buffer.append(f"Report Type: {meta.get('report_type', 'N/A')}")
    output_buffer.append(f"Date: {meta.get('date_of_report', 'N/A')}")
    output_buffer.append("-" * 75)

    diagnoses = data.get("diagnoses", [])
    if diagnoses:
        output_buffer.append("=== DIAGNOSES ===")
        for d in diagnoses:
            cond = d.get("condition", "N/A")
            icd = f" (ICD-10: {d.get('icd_10')})" if d.get("icd_10") else ""
            status = f" [{d.get('status')}]" if d.get("status") else ""
            output_buffer.append(f"• {cond}{icd}{status}")
        output_buffer.append("")

    meds = data.get("medications", [])
    if meds:
        output_buffer.append("=== MEDICATIONS ===")
        for m in meds:
            name = m.get("name", "N/A")
            dose = m.get("dosage", "")
            freq = m.get("frequency", "")
            route = m.get("route", "")
            instr = m.get("instructions", "")
            details = ", ".join(filter(bool, [dose, route, freq, instr]))
            output_buffer.append(f"• {name} - {details}" if details else f"• {name}")
        output_buffer.append("")

    metrics = data.get("detailed_metrics", [])
    if metrics:
        output_buffer.append("=== QUANTITATIVE LAB PARAMETERS ===")
        header = f"{'Test Parameter':<28} | {'Value':<10} | {'Units':<10} | {'Status':<10} | {'Severity':<10}"
        output_buffer.append(header)
        output_buffer.append("-" * 75)
        for row in metrics:
            p = str(row.get("parameter", "N/A"))
            v = str(row.get("value", "N/A"))
            u = str(row.get("units", "N/A"))
            s = str(row.get("interpretation", "Normal"))
            sev = str(row.get("severity", "Normal"))
            output_buffer.append(f"{p:<28} | {v:<10} | {u:<10} | {s:<10} | {sev:<10}")
        output_buffer.append("")

    notes = data.get("physician_notes")
    if notes:
        output_buffer.append("=== PHYSICIAN NOTES / CLINICAL COURSE ===")
        output_buffer.append(str(notes).strip())
        output_buffer.append("")

    output_buffer.append("=== CLINICAL SUMMARY ===")
    summary = data.get("clinical_summary", {})
    if isinstance(summary, dict):
        abnormal = summary.get("abnormal_parameters", [])
        output_buffer.append(f"Abnormal Parameters: {', '.join(abnormal) if abnormal else 'None'}")
        critical = summary.get("critical_flags", [])
        output_buffer.append(f"Critical Flags: {', '.join(critical) if critical else 'None'}")
        output_buffer.append(f"Internal Consistency Notes: {summary.get('internal_consistency_notes', 'N/A')}")
        output_buffer.append("")
        output_buffer.append("Overall Clinical Snapshot:")
        output_buffer.append(summary.get("overall_clinical_snapshot", "N/A"))
    else:
        output_buffer.append(str(summary))

    return "\n".join(output_buffer)


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

    from PIL import Image
    try:
        pil_img = Image.open(image_path)
    except Exception as img_err:
        return {
            "status": "file_error",
            "message": f"Could not open image: {img_err}",
        }

    models_to_try = [MODEL_NAME, "gemini-2.5-flash-lite"]
    last_error: Exception | None = None

    for model in models_to_try:
        wait_time = INITIAL_WAIT
        for attempt in range(MAX_RETRIES + 1):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=[pil_img, SYSTEM_PROMPT],
                )
                raw_text = response.text or ""
                data = _extract_json(raw_text)
                return {
                    "status": "analyzed",
                    "model_used": model,
                    "source_file": image_path.name,
                    "analysis": data,
                    "raw_text": raw_text,
                    "physician_readable": _build_physician_readable_output(data),
                }
            except Exception as exc:
                last_error = exc
                err_str = str(exc)
                if ("503" in err_str or "429" in err_str or "UNAVAILABLE" in err_str or "RESOURCE_EXHAUSTED" in err_str) and attempt < MAX_RETRIES:
                    time.sleep(wait_time)
                    wait_time *= 2
                    continue
                # If non-retryable or retries exhausted for this model, try next model in fallback list
                break

    return {
        "status": "unavailable",
        "source_file": image_path.name,
        "message": f"Report analysis failed: {last_error}",
    }


def serialize_report_analysis(analysis: dict[str, Any]) -> str:
    return json.dumps(analysis, ensure_ascii=True)
