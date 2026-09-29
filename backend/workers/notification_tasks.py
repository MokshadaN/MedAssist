"""Celery tasks for notification delivery (WhatsApp reminders + follow-up emails)."""

import logging

from workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="workers.notification_tasks.process_medicine_reminders",
    max_retries=2,
    default_retry_delay=30,
    queue="notifications",
)
def process_medicine_reminders(self):
    """
    Scan all active medicine schedules and send any due WhatsApp reminders.
    Scheduled to run every 10 minutes via Celery Beat.
    """
    from core.database import SessionLocal
    from services.schedule_service import process_due_reminders

    db = SessionLocal()
    try:
        count = process_due_reminders(db)
        if count:
            logger.info("Sent %d medicine reminder(s).", count)
        return {"sent": count}
    except Exception as exc:
        logger.error("Medicine reminder processing failed: %s", exc, exc_info=True)
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(
    bind=True,
    name="workers.notification_tasks.process_followup_emails",
    max_retries=2,
    default_retry_delay=30,
    queue="notifications",
)
def process_followup_emails(self):
    """
    Send 24h and 1h appointment follow-up emails for upcoming reminders.
    Scheduled to run every 30 minutes via Celery Beat.
    """
    from core.database import SessionLocal
    from services.schedule_service import process_due_followups

    db = SessionLocal()
    try:
        count = process_due_followups(db)
        if count:
            logger.info("Sent %d follow-up email(s).", count)
        return {"sent": count}
    except Exception as exc:
        logger.error("Follow-up email processing failed: %s", exc, exc_info=True)
        raise self.retry(exc=exc)
    finally:
        db.close()
