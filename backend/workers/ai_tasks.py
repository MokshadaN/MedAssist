"""Celery tasks for AI-heavy operations (report analysis, intake summarization)."""

from datetime import datetime
import logging

from services.job_lifecycle import claim_worker_job
from workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="workers.ai_tasks.analyze_report_async",
    max_retries=3,
    default_retry_delay=60,
    queue="ai",
)
def analyze_report_async(self, report_id: str, file_path: str, job_id: str):
    """
    Run Gemini report analysis in the background (P0 report lifecycle).

    - Moves the report through queued → processing → completed/failed.
    - Persists through report_service.update_report_analysis so extracted
      medical metrics populate (single analysis path for HTTP and workers).
    - Idempotent: every request has a persisted job ID that is also used as the
      Celery task ID. Duplicate first-attempt messages cannot claim processing.
    - Explicit failure state: the final failed attempt marks the report
      `failed` so the UI can offer a controlled retry.
    """
    from core.database import SessionLocal
    from models.report import Report
    from services.report_analyzer_service import analyze_report_image, serialize_report_analysis
    from services.report_service import update_report_analysis

    db = SessionLocal()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            logger.warning("Report %s not found in DB — skipping analysis.", report_id)
            return

        if not claim_worker_job(
            db,
            model=Report,
            identity_filters=(Report.id == report_id,),
            entity=report,
            job_id=job_id,
            celery_task_id=self.request.id,
            retries=self.request.retries,
            status_column=Report.analysis_status,
            job_id_column=Report.analysis_job_id,
            updated_at_column=Report.analysis_status_updated_at,
            error_column=Report.analysis_error,
            status_attr="analysis_status",
            job_id_attr="analysis_job_id",
        ):
            logger.info("Ignoring non-runnable or duplicate report job %s.", job_id)
            return

        report = db.query(Report).filter(Report.id == report_id).first()
        logger.info("Starting async report analysis: report_id=%s job_id=%s", report_id, job_id)

        analysis = analyze_report_image(file_path)
        db.expire_all()
        report = db.query(Report).filter(Report.id == report_id).first()
        if (
            not report
            or report.analysis_job_id != job_id
            or report.analysis_status != "processing"
        ):
            db.rollback()
            logger.info("Report job %s was superseded before completion.", job_id)
            return

        if analysis.get("status") == "analyzed":
            # Parsed data, replacement metrics, and terminal state commit in
            # one transaction, preventing partially completed analyses.
            update_report_analysis(
                db,
                report,
                serialize_report_analysis(analysis),
                commit=False,
            )
            report.analysis_status = "completed"
            report.analysis_status_updated_at = datetime.utcnow()
            report.analysis_error = None
            db.add(report)
            db.commit()
            logger.info("Report job %s analyzed and saved successfully.", job_id)
        else:
            report.analysis_status = "failed"
            report.analysis_status_updated_at = datetime.utcnow()
            report.analysis_error = "The report could not be analyzed."
            db.add(report)
            db.commit()
            logger.warning(
                "Report job %s returned non-success status: %s",
                job_id,
                analysis.get("status"),
            )

    except Exception as exc:
        db.rollback()
        logger.error("Report analysis failed for %s: %s", report_id, exc, exc_info=True)
        try:
            report = db.query(Report).filter(Report.id == report_id).first()
            if (
                report is not None
                and report.analysis_job_id == job_id
                and (report.analysis_status or "") != "completed"
            ):
                exhausted = self.request.retries >= self.max_retries
                report.analysis_status = "failed" if exhausted else "processing"
                report.analysis_status_updated_at = datetime.utcnow()
                report.analysis_error = (
                    "Report analysis failed after all retry attempts."
                    if exhausted
                    else "Report analysis retry scheduled."
                )
                db.add(report)
                db.commit()
                if exhausted:
                    logger.error("Report job %s exhausted retries.", job_id)
        except Exception:
            db.rollback()
            logger.exception("Could not persist failure state for report %s", report_id)
        if self.request.retries >= self.max_retries:
            raise
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(
    bind=True,
    name="workers.ai_tasks.run_risk_check_async",
    max_retries=2,
    default_retry_delay=30,
    queue="ai",
)
def run_risk_check_async(self, prescription_id: str, doctor_id: str, job_id: str):
    """
    Run PubMedBERT semantic drug-risk analysis in the background.
    The persisted prescription lifecycle prevents concurrent duplicate checks
    and exposes exhausted failures to the API.
    """
    from core.database import SessionLocal
    from models.prescription import Prescription
    from services.risk_service import run_risk_check

    db = SessionLocal()
    try:
        prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
        if not prescription:
            logger.info("Ignoring stale risk job %s.", job_id)
            return
        if not claim_worker_job(
            db,
            model=Prescription,
            identity_filters=(Prescription.id == prescription_id,),
            entity=prescription,
            job_id=job_id,
            celery_task_id=self.request.id,
            retries=self.request.retries,
            status_column=Prescription.risk_status,
            job_id_column=Prescription.risk_job_id,
            updated_at_column=Prescription.risk_status_updated_at,
            error_column=Prescription.risk_error,
            status_attr="risk_status",
            job_id_attr="risk_job_id",
        ):
            logger.info("Ignoring non-runnable or duplicate risk job %s.", job_id)
            return

        logger.info("Starting async risk check: prescription_id=%s job_id=%s", prescription_id, job_id)
        result = run_risk_check(db, prescription_id, doctor_id, commit=False)
        db.expire_all()
        prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
        if (
            not prescription
            or prescription.risk_job_id != job_id
            or prescription.risk_status != "processing"
        ):
            db.rollback()
            logger.info("Risk job %s was superseded before completion.", job_id)
            return
        prescription.risk_status = "completed"
        prescription.risk_status_updated_at = datetime.utcnow()
        prescription.risk_error = None
        db.add(prescription)
        db.commit()
        logger.info("Risk check complete for %s — severity: %s", prescription_id, result.get("severity"))
        return result
    except Exception as exc:
        db.rollback()
        logger.error("Risk check failed for %s: %s", prescription_id, exc, exc_info=True)
        try:
            prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
            if prescription and prescription.risk_job_id == job_id:
                exhausted = self.request.retries >= self.max_retries
                prescription.risk_status = "failed" if exhausted else "processing"
                prescription.risk_status_updated_at = datetime.utcnow()
                prescription.risk_error = (
                    "Risk check failed after all retry attempts."
                    if exhausted
                    else "Risk check retry scheduled."
                )
                db.add(prescription)
                db.commit()
        except Exception:
            db.rollback()
            logger.exception("Could not persist failure state for risk job %s", job_id)
        if self.request.retries >= self.max_retries:
            raise
        raise self.retry(exc=exc)
    finally:
        db.close()