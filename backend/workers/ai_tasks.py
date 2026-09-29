"""Celery tasks for AI-heavy operations (report analysis, intake summarization)."""

import logging

from workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="workers.ai_tasks.analyze_report_async",
    max_retries=3,
    default_retry_delay=60,
    queue="ai",
)
def analyze_report_async(self, report_id: str, file_path: str):
    """
    Run Gemini report analysis in the background.
    Triggered after a report is uploaded; updates the report record when done.
    """
    from core.database import SessionLocal
    from models.report import Report
    from services.report_analyzer_service import analyze_report_image, serialize_report_analysis

    db = SessionLocal()
    try:
        logger.info("Starting async report analysis: report_id=%s", report_id)
        analysis = analyze_report_image(file_path)

        if analysis.get("status") == "analyzed":
            report = db.query(Report).filter(Report.id == report_id).first()
            if report:
                report.parsed_data = serialize_report_analysis(analysis)
                db.commit()
                logger.info("Report %s analyzed and saved successfully.", report_id)
            else:
                logger.warning("Report %s not found in DB after analysis.", report_id)
        else:
            logger.warning("Report %s analysis returned non-success status: %s", report_id, analysis.get("status"))

    except Exception as exc:
        logger.error("Report analysis failed for %s: %s", report_id, exc, exc_info=True)
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
def run_risk_check_async(self, prescription_id: str, doctor_id: str):
    """
    Run PubMedBERT semantic drug-risk analysis in the background.
    Returns the risk check result (stored in DB).
    """
    from core.database import SessionLocal
    from services.risk_service import run_risk_check

    db = SessionLocal()
    try:
        logger.info("Starting async risk check: prescription_id=%s", prescription_id)
        result = run_risk_check(db, prescription_id, doctor_id)
        logger.info("Risk check complete for %s — severity: %s", prescription_id, result.get("severity"))
        return result
    except Exception as exc:
        logger.error("Risk check failed for %s: %s", prescription_id, exc, exc_info=True)
        raise self.retry(exc=exc)
    finally:
        db.close()
