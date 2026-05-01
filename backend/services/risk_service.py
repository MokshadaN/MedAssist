"""Prescription risk check service."""

import json
import os
import time
from collections import Counter
from functools import lru_cache
from pathlib import Path

import numpy as np
from fastapi import HTTPException, status
from huggingface_hub import InferenceClient
from sqlalchemy.orm import Session

from core.config import settings
from models.ai_summary import AISummary
from models.prescription import Prescription, PrescriptionItem
from models.risk import RiskCheck
from models.visit import Visit

# BioBERT model for clinical embeddings
MODEL_ID = "NeuML/pubmedbert-base-embeddings"
THRESHOLD = 0.65

# Load drug side effects data
DRUGS_JSON_PATH = Path(__file__).resolve().parents[1] / "data" / "drugs.json"
DRUG_SIDE_EFFECTS = {}
if DRUGS_JSON_PATH.exists():
    try:
        with open(DRUGS_JSON_PATH, "r") as f:
            drugs_list = json.load(f)
            DRUG_SIDE_EFFECTS = {d["name"].lower(): d["side_effects"] for d in drugs_list}
    except Exception:
        pass


HIGH_RISK_MEDICINES = {
    "warfarin",
    "insulin",
    "digoxin",
    "lithium",
    "methotrexate",
}


def _get_prescription_for_doctor(db: Session, prescription_id: str, doctor_id: str) -> Prescription:
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found")

    if prescription.doctor_id != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access this prescription",
        )

    return prescription


@lru_cache(maxsize=100)
def _get_embedding(text: str) -> np.ndarray:
    """Get embedding from Hugging Face Inference API with local caching."""
    if not settings.hf_token:
        return np.zeros(768)  # Fallback if no token

    client = InferenceClient(api_key=settings.hf_token)
    try:
        output = client.feature_extraction(text, model=MODEL_ID)
        arr = np.array(output)
        if arr.ndim == 2:
            return arr[0]
        if arr.ndim == 3:
            return arr[0][0]
        return arr
    except Exception:
        return np.zeros(768)


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Standard cosine similarity."""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def _get_patient_symptoms(db: Session, visit_id: str) -> list[str]:
    """Extract symptoms from the AI Summary subjective section."""
    if not visit_id:
        return []

    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit or not visit.summary_id:
        return []

    summary = db.query(AISummary).filter(AISummary.id == visit.summary_id).first()
    if not summary or not summary.subjective:
        return []

    # Simple heuristic: split by common delimiters
    text = summary.subjective.lower()
    # Remove common preamble
    if "patient reports" in text:
        text = text.split("patient reports", 1)[1]

    symptoms = [s.strip() for s in text.replace(",", ".").split(".") if len(s.strip()) > 3]
    return symptoms[:10]  # Limit to top 10 symptoms for performance


def _build_issues(items: list[PrescriptionItem]) -> list[dict]:
    issues: list[dict] = []

    if not items:
        return [
            {
                "type": "empty_prescription",
                "severity": "medium",
                "message": "Prescription has no medicines added yet.",
            }
        ]

    normalized_names = [
        item.medicine_name.strip().lower()
        for item in items
        if item.medicine_name and item.medicine_name.strip()
    ]
    duplicate_names = sorted(name for name, count in Counter(normalized_names).items() if count > 1)
    for name in duplicate_names:
        issues.append(
            {
                "type": "duplicate_medicine",
                "severity": "medium",
                "medicine_name": name,
                "message": f"{name.title()} appears more than once in this prescription.",
            }
        )

    for item in items:
        missing_fields = [
            field
            for field in ("medicine_name", "dosage", "duration", "frequency")
            if not (getattr(item, field) or "").strip()
        ]
        if missing_fields:
            issues.append(
                {
                    "type": "missing_prescription_details",
                    "severity": "medium",
                    "item_id": item.id,
                    "missing_fields": missing_fields,
                    "message": "Prescription item is missing required medication instructions.",
                }
            )

        medicine_name = (item.medicine_name or "").strip().lower()
        if medicine_name in HIGH_RISK_MEDICINES:
            issues.append(
                {
                    "type": "high_risk_medicine",
                    "severity": "high",
                    "item_id": item.id,
                    "medicine_name": item.medicine_name,
                    "message": f"{item.medicine_name} requires extra monitoring and counseling.",
                }
            )

    return issues


def _check_semantic_risks(
    db: Session, prescription: Prescription, items: list[PrescriptionItem]
) -> list[dict]:
    """Check for semantic matches between patient symptoms and drug side effects."""
    issues = []
    symptoms = _get_patient_symptoms(db, prescription.visit_id)
    if not symptoms:
        return []

    # Pre-calculate symptom embeddings
    symptom_embs = []
    for s in symptoms:
        emb = _get_embedding(s)
        if not np.all(emb == 0):
            symptom_embs.append({"text": s, "emb": emb})

    if not symptom_embs:
        return []

    for item in items:
        medicine_name = (item.medicine_name or "").strip().lower()
        side_effects = DRUG_SIDE_EFFECTS.get(medicine_name, [])

        for effect in side_effects:
            eff_emb = _get_embedding(effect)
            if np.all(eff_emb == 0):
                continue

            for sym in symptom_embs:
                score = _cosine_similarity(sym["emb"], eff_emb)
                if score >= THRESHOLD:
                    severity = "high" if score >= 0.88 else "medium"
                    issues.append(
                        {
                            "type": "semantic_risk",
                            "severity": severity,
                            "medicine_name": item.medicine_name,
                            "symptom": sym["text"],
                            "matched_side_effect": effect,
                            "similarity_score": round(score, 4),
                            "message": f"Patient's '{sym['text']}' may be worsened by {item.medicine_name} (linked to '{effect}').",
                        }
                    )

    return issues


def _overall_severity(issues: list[dict]) -> str:
    if any(issue["severity"] == "high" for issue in issues):
        return "high"
    if any(issue["severity"] == "medium" for issue in issues):
        return "medium"
    return "low"


def _serialize_risk_check(risk_check: RiskCheck) -> dict:
    return {
        "id": risk_check.id,
        "prescription_id": risk_check.prescription_id,
        "issues": json.loads(risk_check.issues or "[]"),
        "severity": risk_check.severity,
        "created_at": risk_check.created_at,
    }


def run_risk_check(db: Session, prescription_id: str, doctor_id: str) -> dict:
    prescription = _get_prescription_for_doctor(db, prescription_id, doctor_id)
    items = (
        db.query(PrescriptionItem)
        .filter(PrescriptionItem.prescription_id == prescription_id)
        .order_by(PrescriptionItem.id.asc())
        .all()
    )

    issues = _build_issues(items)
    # Add semantic risk checks
    semantic_issues = _check_semantic_risks(db, prescription, items)
    issues.extend(semantic_issues)

    risk_check = RiskCheck(
        prescription_id=prescription_id,
        issues=json.dumps(issues),
        severity=_overall_severity(issues),
    )
    db.add(risk_check)
    db.commit()
    db.refresh(risk_check)

    return _serialize_risk_check(risk_check)


def get_latest_risk_check(db: Session, prescription_id: str, doctor_id: str) -> dict:
    _get_prescription_for_doctor(db, prescription_id, doctor_id)
    risk_check = (
        db.query(RiskCheck)
        .filter(RiskCheck.prescription_id == prescription_id)
        .order_by(RiskCheck.created_at.desc())
        .first()
    )
    if not risk_check:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk check not found for this prescription",
        )

    return _serialize_risk_check(risk_check)
