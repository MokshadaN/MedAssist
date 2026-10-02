"""Celery application factory — wired to Redis broker from settings."""

import os
import sys
from pathlib import Path

# Use the OS certificate store for TLS (Windows: corporate/university SSL
# inspection proxies aren't in Python's bundled CA list). Must run before
# any network library (requests/httpx) performs TLS.
import truststore  # noqa: E402
truststore.inject_into_ssl()

# Ensure backend package is importable when running celery from CLI
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from celery import Celery  # noqa: E402
from celery.signals import worker_process_init # noqa: E402
from celery.schedules import crontab # noqa: E402
from core.config import settings  # noqa: E402
from core.logging_config import configure_logging # noqa: E402
from core.observability import setup_sentry # noqa: E402

# ── Broker & Backend URL ──────────────────────────────────────────────────────
# Redis is used both as the message broker and result backend.
# If REDIS_PASSWORD is set, inject it into the URL.
_redis_password = os.getenv("REDIS_PASSWORD", "")
_redis_host = os.getenv("REDIS_HOST", "redis")
_redis_port = os.getenv("REDIS_PORT", "6379")

if _redis_password:
    _broker_url = f"redis://:{_redis_password}@{_redis_host}:{_redis_port}/0"
    _backend_url = f"redis://:{_redis_password}@{_redis_host}:{_redis_port}/1"
else:
    _broker_url = f"redis://{_redis_host}:{_redis_port}/0"
    _backend_url = f"redis://{_redis_host}:{_redis_port}/1"

# ── Application ───────────────────────────────────────────────────────────────
celery_app = Celery(
    "medassist",
    broker=_broker_url,
    backend=_backend_url,
    include=[
        "workers.ai_tasks",
        "workers.notification_tasks",
        "workers.triage_tasks",
    ],
)

celery_app.conf.update(
    # Task routing by queue
    task_routes={
        "workers.ai_tasks.*": {"queue": "ai"},
        "workers.notification_tasks.*": {"queue": "notifications"},
        "workers.triage_tasks.*": {"queue": "triage"},
    },
    # Explicit default queue: unroutes tasks land on "celery" and workers must
    # subscribe to it too (P0: the compose worker command uses
    # `-Q ai,notifications,triage,celery`).
    task_default_queue="celery",

    # Serialization
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],

    # Reliability
    task_acks_late=True,           # Acknowledge only after task completes (prevents lost tasks on crash)
    worker_prefetch_multiplier=1,  # Fetch one task at a time per worker (fair distribution)
    task_reject_on_worker_lost=True,

    # Monitoring (P0): emit task/worker events so queue depth, runtime,
    # retries and failures are observable (Flower, Sentry, etc.).
    worker_send_task_events=True,
    task_send_sent_event=True,

    # Result expiry
    result_expires=3600,           # Keep results for 1 hour

    # Time limits
    task_soft_time_limit=300,      # 5 min soft limit (raises SoftTimeLimitExceeded)
    task_time_limit=600,           # 10 min hard limit (kills the worker process)

    # Retry policy
    task_default_retry_delay=60,   # 60s between retries
    task_max_retries=3,

    # ── Periodic Tasks (Celery Beat) ──────────────────────────────────────────
    # NOTE: Beat must run as EXACTLY ONE scheduler instance — the compose
    # "beat" service is a single, non-scaled replica.
    beat_schedule={
        "process-medicine-reminders": {
            "task": "workers.notification_tasks.process_medicine_reminders",
            "schedule": crontab(minute="*/10"),
        },
        "process-followup-emails": {
            "task": "workers.notification_tasks.process_followup_emails",
            "schedule": crontab(minute="*/30"),
        },
    },
)

# ── Observability ─────────────────────────────────────────────────────────────
@worker_process_init.connect
def init_celery_observability(**kwargs):
    """
    Initialize Sentry and structured logging inside the Celery worker process.
    Must hook into worker_process_init because Celery uses multiprocessing.
    """
    configure_logging(environment=settings.environment, log_level=settings.log_level)
    setup_sentry(settings)
