"""Centralized prompt builders."""

REPORT_PROMPT = """
Role: You are a specialized Medical Informatics Agent. Your task is to analyze the attached medical image (X-ray, MRI, CT, or Lab Report) and convert the findings into a structured JSON format followed by a patient-friendly summary.

Instructions:
* Identify Modality: Determine if the image is a diagnostic scan (Radiology) or a fluid analysis (Pathology/Blood work).
* Data Extraction: Extract every measurable value, reference range, and clinical observation.
* JSON Structure: - For Lab Reports: Use keys for test_name, result, units, reference_range, and flag (High/Low/Normal).
* For Scans: Use keys for body_part, technique, findings, and impression.

Summary Generation: Provide a 2-paragraph summary:
Paragraph 1: What was tested and why.
Paragraph 2: Key abnormalities or "Critical Values" found. Do not infer any cause. If the value is higher, specify it and the expected range.

Strict Constraints:
1. Do not hallucinate values. If text is blurry, mark as "unreadable".
2. Maintain medical terminology in the JSON but use "Layman's terms" in the summary.
3. Output the JSON first, then the Summary.

Desired JSON Schema:

{
  "report_metadata": {
    "patient_id_redacted": "boolean",
    "date_of_report": "string",
    "report_type": "string"
  },
  "detailed_metrics": [
    {
      "parameter": "string",
      "value": "string",
      "interpretation": "string"
    }
  ],
  "clinical_impression": "string"
}
"""

TRIAGE_SYSTEM_PROMPT = (
    "You are a medical emergency detection JSON API. You MUST return strictly valid JSON and nothing else."
)


def triage_prompt(transcript: str) -> str:
    return f"""
You are a medical triage AI. Analyze the patient transcript below to determine if this is a severe medical emergency requiring immediate attention (like a heart attack, stroke, severe bleeding, or extreme pain).

Transcript: "{transcript}"

Return a STRICT JSON object in this exact format:
{{
    "urgent": true or false,
    "matched_terms": ["list of concerning phrases from transcript, empty if none"]
}}
"""


def question_prompt(transcript: str) -> str:
    return f"""
You are an expert clinical documentation specialist and medical data extraction AI.
Your task is to analyze the provided medical transcript and extract the information into a structured JSON format exactly matching the schema below.

REQUIRED JSON SCHEMA:
{{
  "name": "string or null - primary symptom or condition explicitly mentioned",
  "severity": "string or null - mild, moderate, or severe if explicitly stated",
  "duration": "string or null - how long the symptom has been present",
  "trend": "string or null - worsening, improving, or stable if mentioned",
  "frequency": "string or null - how often the symptom occurs",
  "triggers": ["list of strings - things that make it worse, empty list if none mentioned"],
  "relievers": ["list of strings - things that make it better, empty list if none mentioned"],
  "impact": ["list of strings - how it affects daily life, empty list if none mentioned"],
  "confidence": "string or null - your confidence in the extraction: high, medium, or low"
}}

CRITICAL EXTRACTION RULES:
1. EXPLICIT MENTIONS ONLY: If a data point is NOT explicitly discussed in the transcript, return null for that field.
2. NO INFERENCE: Do not use general medical knowledge to infer symptoms or conditions. Do not guess.
3. Missing information means null, not false.
4. If a patient's response is ambiguous (e.g., "I think so", "Maybe"), use null.
5. Return ONLY the JSON object. No explanation, no extra text.

<transcript>
{transcript}
</transcript>
"""


def intake_summary_prompt(transcript: str) -> str:
    return f"""
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


def follow_up_prompt(missing_fields, data, transcript):
    return f"""
You are a clinical intake assistant.

Some structured fields are missing from the intake.

Missing fields:
{missing_fields}

Current structured data:
{data.model_dump()}

Full transcript:
{transcript}

Ask ONE single professional clarification question
that naturally gathers ALL missing information at once.

Rules:
- Do NOT diagnose
- Do NOT provide medical advice
- Keep under 30 words
- Ask only ONE question
- Be neutral and clinical
"""


def summary_prompt_1(transcript, data):
    return f"""
Summarize this medical intake professionally.

Structured Data:
{data.model_dump()}

Transcript:
{transcript}

Do NOT diagnose or prescribe.
"""


def ai_reply_prompt(message: str) -> str:
    return f"""
You are a medical intake assistant.
Reply briefly and clearly to the patient's message below.
Do not diagnose.
Do not give emergency instructions unless the message clearly mentions danger.

Patient message:
{message}
"""
