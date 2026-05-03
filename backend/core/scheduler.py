"""Background scheduler for processing recurring medicine reminders."""

import logging

from apscheduler.schedulers.background import BackgroundScheduler

from core.database import SessionLocal
from services.schedule_service import process_due_reminders, process_due_followups

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def _tick():
    """Scheduler tick: check for due medicine reminders and send them."""
    db = SessionLocal()
    try:
        count = process_due_reminders(db)
        if count:
            logger.info("Scheduler tick: processed %d reminder(s)", count)
            
        followups = process_due_followups(db)
        if followups:
            logger.info("Scheduler tick: processed %d follow-up email(s)", followups)
    except Exception as exc:
        logger.error("Scheduler tick error: %s", exc)
    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler (runs every 60 seconds)."""
    if scheduler.running:
        return
    scheduler.add_job(_tick, "interval", seconds=60, id="medicine_reminders", replace_existing=True)
    scheduler.start()
    logger.info("Medicine reminder scheduler started (every 60s)")


def stop_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Medicine reminder scheduler stopped")
