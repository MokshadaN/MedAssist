from sqlalchemy.orm import Session
from models.report import Report
from models.metric import MedicalMetric
from typing import Callable, List
import json
import logging
import re
from datetime import datetime
from pathlib import Path
from dateutil import parser as date_parser

from core.domain_errors import ResourceConflict, ResourceNotFound, ServiceUnavailable
from services.job_lifecycle import enqueue_job, is_stale, stale_before

logger = logging.getLogger(__name__)


def get_report_or_raise(db: Session, report_id: str) -> Report:
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise ResourceNotFound("Report not found")
    return report


def get_report_by_filename_or_raise(db: Session, filename: str) -> Report:
    report = db.query(Report).filter(Report.file_url.endswith(filename)).first()
    if not report:
        raise ResourceNotFound("Report not found")
    return report


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

def get_reports(
    db: Session,
    patient_id: str,
    *,
    limit: int = 50,
    offset: int = 0,
) -> List[Report]:
    """
    Get all reports for a specific patient.
    """
    return (
        db.query(Report)
        .filter(Report.patient_id == patient_id)
        .order_by(Report.uploaded_at.desc(), Report.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def delete_report(db: Session, report: Report) -> None:
    """
    Delete a report record from the database.
    """
    db.delete(report)
    db.commit()


def delete_report_with_file(db: Session, report: Report, upload_dir: Path) -> None:
    disk_path = upload_dir / Path(report.file_url).name
    if disk_path.exists():
        disk_path.unlink()
    delete_report(db, report)


def queue_report_analysis(
    db: Session,
    report: Report,
    *,
    disk_path: Path,
    stale_minutes: int,
    enqueue: Callable[[str, str, str], None],
) -> Report:
    """Claim and enqueue one report-analysis job as an application workflow."""
    current_status = report.analysis_status or "uploaded"
    if current_status == "completed":
        raise ResourceConflict("Report has already been analyzed")

    cutoff = stale_before(stale_minutes)
    in_progress = current_status in {"queued", "processing"}
    stale_job = is_stale(current_status, report.analysis_status_updated_at, cutoff)
    if in_progress and not stale_job:
        raise ResourceConflict("Report analysis is already in progress")
    if not disk_path.exists():
        raise ResourceNotFound("Report file not found on server")

    job_id = enqueue_job(
        db,
        model=Report,
        identity_filters=(Report.id == report.id,),
        status_column=Report.analysis_status,
        job_id_column=Report.analysis_job_id,
        updated_at_column=Report.analysis_status_updated_at,
        error_column=Report.analysis_error,
        current_status=current_status,
        current_job_id=report.analysis_job_id,
        stale_cutoff=cutoff if stale_job else None,
    )
    if job_id is None:
        raise ResourceConflict("Report analysis is already in progress")

    try:
        enqueue(report.id, str(disk_path), job_id)
    except Exception:
        db.query(Report).filter(
            Report.id == report.id,
            Report.analysis_job_id == job_id,
            Report.analysis_status == "queued",
        ).update(
            {
                Report.analysis_status: "failed",
                Report.analysis_status_updated_at: datetime.utcnow(),
                Report.analysis_error: "Background analysis service is unavailable.",
            },
            synchronize_session=False,
        )
        db.commit()
        raise ServiceUnavailable(
            "Report analysis could not be queued — the background task "
            "service is unavailable. Try again later."
        )

    db.expire_all()
    return get_report_or_raise(db, report.id)


def update_report_analysis(
    db: Session,
    report: Report,
    parsed_data: str | None,
    *,
    commit: bool = True,
) -> Report:
    """
    Update the stored analysis for a report.
    """
    report.parsed_data = parsed_data
    db.add(report)

    # Also save the individual metrics for easier graphing
    if parsed_data:
        try:
            analysis_dict = json.loads(parsed_data)
            # The structure in report_analyzer_service is {"analysis": { ... }}
            # and that analysis dict has "detailed_metrics"
            raw_data = analysis_dict.get("analysis", {})
            metrics = raw_data.get("detailed_metrics", [])
            
            # Try to get the report date
            report_date = None
            metadata = raw_data.get("report_metadata", {})
            date_str = metadata.get("date_of_report")
            if date_str:
                try:
                    report_date = date_parser.parse(date_str)
                except (TypeError, ValueError, OverflowError):
                    logger.warning("Invalid report date for report %s", report.id)

            # Replacing metrics makes a retried job idempotent even if a prior
            # attempt persisted part of the analysis before interruption.
            db.query(MedicalMetric).filter(MedicalMetric.report_id == report.id).delete(
                synchronize_session=False
            )
            save_medical_metrics(
                db,
                report.patient_id,
                report.id,
                metrics,
                report_date,
                commit=False,
            )
        except (json.JSONDecodeError, TypeError, AttributeError, ValueError):
            logger.exception("Could not parse metrics for report %s", report.id)

    if commit:
        db.commit()
        db.refresh(report)
    else:
        db.flush()

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

def save_medical_metrics(
    db: Session,
    patient_id: str,
    report_id: str,
    metrics: List[dict],
    measured_at: datetime = None,
    *,
    commit: bool = True,
) -> List[MedicalMetric]:
    """
    Save extracted metrics to the medical_metrics table.
    """
    db_metrics = []
    timestamp = measured_at or datetime.utcnow()
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
            severity=m.get("severity"),
            measured_at=timestamp
        )
        db.add(db_metric)
        db_metrics.append(db_metric)
    
    if commit:
        db.commit()
    else:
        db.flush()
    return db_metrics

def get_patient_metrics(
    db: Session,
    patient_id: str,
    parameter: str = None,
    *,
    limit: int = 50,
    offset: int = 0,
) -> List[MedicalMetric]:
    """
    Retrieve metrics for a patient, optionally filtered by parameter name.
    """
    query = db.query(MedicalMetric).filter(MedicalMetric.patient_id == patient_id)
    if parameter:
        query = query.filter(MedicalMetric.parameter.ilike(f"%{parameter}%"))
    return (
        query.order_by(MedicalMetric.measured_at.desc(), MedicalMetric.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
