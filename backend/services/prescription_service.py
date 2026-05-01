"""Prescription service."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.prescription import Prescription, PrescriptionItem
from models.visit import Visit


def _get_visit_or_404(db: Session, visit_id: str) -> Visit:
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    return visit


def _get_prescription_or_404(db: Session, prescription_id: str) -> Prescription:
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found")
    return prescription


def _serialize_prescription(db: Session, prescription: Prescription) -> dict:
    items = (
        db.query(PrescriptionItem)
        .filter(PrescriptionItem.prescription_id == prescription.id)
        .order_by(PrescriptionItem.id.asc())
        .all()
    )
    return {
        "id": prescription.id,
        "visit_id": prescription.visit_id,
        "doctor_id": prescription.doctor_id,
        "notes": prescription.notes,
        "created_at": prescription.created_at,
        "items": [
            {
                "id": item.id,
                "prescription_id": item.prescription_id,
                "medicine_name": item.medicine_name,
                "dosage": item.dosage,
                "duration": item.duration,
                "frequency": item.frequency,
            }
            for item in items
        ],
    }


def create_prescription(db: Session, visit_id: str, notes: str, doctor_id: str):
    visit = _get_visit_or_404(db, visit_id)
    if visit.doctor_id != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to create a prescription for this visit",
        )

    existing = db.query(Prescription).filter(Prescription.visit_id == visit_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prescription already exists for this visit",
        )

    prescription = Prescription(
        visit_id=visit_id,
        doctor_id=doctor_id,
        notes=notes,
    )
    db.add(prescription)
    db.commit()
    db.refresh(prescription)
    return _serialize_prescription(db, prescription)


def add_item(db: Session, prescription_id: str, medicine_name: str, dosage: str, duration: str, frequency: str, doctor_id: str | None = None):
    prescription = _get_prescription_or_404(db, prescription_id)
    if doctor_id and prescription.doctor_id != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to modify this prescription",
        )

    item = PrescriptionItem(
        prescription_id=prescription_id,
        medicine_name=medicine_name,
        dosage=dosage,
        duration=duration,
        frequency=frequency,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {
        "id": item.id,
        "prescription_id": item.prescription_id,
        "medicine_name": item.medicine_name,
        "dosage": item.dosage,
        "duration": item.duration,
        "frequency": item.frequency,
    }


def get_prescription_by_visit(db: Session, visit_id: str, doctor_id: str | None = None):
    visit = _get_visit_or_404(db, visit_id)
    if doctor_id and visit.doctor_id != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access this prescription",
        )

    prescription = db.query(Prescription).filter(Prescription.visit_id == visit_id).first()
    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found",
        )

    return _serialize_prescription(db, prescription)


def get_patient_prescriptions(db: Session, patient_id: str):
    visits = db.query(Visit).filter(Visit.patient_id == patient_id).all()
    visit_ids = [visit.id for visit in visits]
    if not visit_ids:
        return []

    prescriptions = (
        db.query(Prescription)
        .filter(Prescription.visit_id.in_(visit_ids))
        .order_by(Prescription.created_at.desc())
        .all()
    )
    return [_serialize_prescription(db, prescription) for prescription in prescriptions]

