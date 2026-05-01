from sqlalchemy.orm import Session
from models.report import Report
from models.metric import MedicalMetric
from typing import List, Any
import json
import re

def save_report(db: Session, patient_id: str, file_url: str, parsed_data: str = None) -> Report:
    """
    Save a report record to the database.
    """
    db_report = Report(
        patient_id=patient_id,
        file_url=file_url,
        parsed_data=parsed_data
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

def get_reports(db: Session, patient_id: str) -> List[Report]:
    """
    Get all reports for a specific patient.
    """
    return db.query(Report).filter(Report.patient_id == patient_id).all()


def delete_report(db: Session, report: Report) -> None:
    """
    Delete a report record from the database.
    """
    db.delete(report)
    db.commit()


def update_report_analysis(db: Session, report: Report, parsed_data: str | None) -> Report:
    """
    Update the stored analysis for a report.
    """
    report.parsed_data = parsed_data
    db.add(report)
    db.commit()
    db.refresh(report)
    
    # Also save the individual metrics for easier graphing
    if parsed_data:
        try:
            analysis_dict = json.loads(parsed_data)
            # The structure in report_analyzer_service is {"analysis": { ... }}
            # and that analysis dict has "detailed_metrics"
            raw_data = analysis_dict.get("analysis", {})
            metrics = raw_data.get("detailed_metrics", [])
            save_medical_metrics(db, report.patient_id, report.id, metrics)
        except Exception as e:
            print(f"Error saving individual metrics: {e}")
            
    return report

def _clean_numeric_value(value_str: str) -> float | None:
    """
    Try to extract a float value from a string.
    Handles formats like '12.5', '12.5 mg/dL', '< 5.0', etc.
    """
    try:
        # Match the first number in the string (integer or decimal)
        match = re.search(r"[-+]?\d*\.\d+|\d+", value_str)
        if match:
            return float(match.group())
    except:
        pass
    return None

def save_medical_metrics(db: Session, patient_id: str, report_id: str, metrics: List[dict]) -> List[MedicalMetric]:
    """
    Save extracted metrics to the medical_metrics table.
    """
    db_metrics = []
    for m in metrics:
        raw_val = str(m.get("value", ""))
        db_metric = MedicalMetric(
            patient_id=patient_id,
            report_id=report_id,
            parameter=m.get("parameter", "Unknown"),
            value=_clean_numeric_value(raw_val),
            raw_value=raw_val,
            units=m.get("units"),
            interpretation=m.get("interpretation"),
            severity=m.get("severity")
        )
        db.add(db_metric)
        db_metrics.append(db_metric)
    
    db.commit()
    return db_metrics

def get_patient_metrics(db: Session, patient_id: str, parameter: str = None) -> List[MedicalMetric]:
    """
    Retrieve metrics for a patient, optionally filtered by parameter name.
    """
    query = db.query(MedicalMetric).filter(MedicalMetric.patient_id == patient_id)
    if parameter:
        query = query.filter(MedicalMetric.parameter.ilike(f"%{parameter}%"))
    return query.order_by(MedicalMetric.measured_at.desc()).all()
