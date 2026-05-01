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


def _build_physician_readable_output(data: dict[str, Any]) -> str:
    output_buffer: list[str] = []

    meta = data.get("report_metadata", {})
    output_buffer.append("=== REPORT METADATA ===")
    output_buffer.append(f"Report Type: {meta.get('report_type', 'N/A')}")
    output_buffer.append(f"Date: {meta.get('date_of_report', 'N/A')}")
    output_buffer.append("-" * 75)

    header = f"{'Test Parameter':<28} | {'Value':<10} | {'Units':<10} | {'Status':<10} | {'Severity':<10}"
    output_buffer.append(header)
    output_buffer.append("-" * 75)

    for row in data.get("detailed_metrics", []):
        p = str(row.get("parameter", "N/A"))
        v = str(row.get("value", "N/A"))
        u = str(row.get("units", "N/A"))
        s = str(row.get("interpretation", "Normal"))
        sev = str(row.get("severity", "Normal"))
        output_buffer.append(f"{p:<28} | {v:<10} | {u:<10} | {s:<10} | {sev:<10}")

    output_buffer.append("")
    output_buffer.append("=== CLINICAL SUMMARY ===")
    summary = data.get("clinical_summary", {})
    if isinstance(summary, dict):
        abnormal = summary.get("abnormal_parameters", [])
        output_buffer.append(f"Abnormal Parameters: {', '.join(abnormal) if abnormal else 'None'}")
        output_buffer.append("")
        output_buffer.append("System-wise Grouping:")
        system_group = summary.get("system_wise_grouping", {})
        if isinstance(system_group, dict):
            for key, value in system_group.items():
                output_buffer.append(f"  {key}: {value}")
        output_buffer.append(f"Hematologic Pattern: {summary.get('hematologic_pattern', 'N/A')}")
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
                "physician_readable": _build_physician_readable_output(data),
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
