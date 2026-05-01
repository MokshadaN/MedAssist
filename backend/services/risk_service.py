"""Prescription risk check service."""

import json
from collections import Counter

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.prescription import Prescription, PrescriptionItem
from models.risk import RiskCheck


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
    _get_prescription_for_doctor(db, prescription_id, doctor_id)
    items = (
        db.query(PrescriptionItem)
        .filter(PrescriptionItem.prescription_id == prescription_id)
        .order_by(PrescriptionItem.id.asc())
        .all()
    )

    issues = _build_issues(items)
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
