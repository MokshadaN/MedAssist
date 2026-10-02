"""Guard the single-scheduler architecture."""

from pathlib import Path

from workers.celery_app import celery_app


BACKEND_DIR = Path(__file__).resolve().parents[1]


def test_legacy_scheduler_modules_are_removed():
    assert not (BACKEND_DIR / "core" / "scheduler.py").exists()
    assert not list((BACKEND_DIR / "cron").glob("*.py"))


def test_celery_beat_owns_periodic_notification_jobs():
    schedules = celery_app.conf.beat_schedule

    assert schedules["process-medicine-reminders"]["task"] == (
        "workers.notification_tasks.process_medicine_reminders"
    )
    assert schedules["process-followup-emails"]["task"] == (
        "workers.notification_tasks.process_followup_emails"
    )
