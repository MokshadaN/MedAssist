"""Small optimistic-lock helpers for persisted Celery job lifecycles."""

from datetime import datetime, timedelta
from typing import Any, Iterable
import uuid

from sqlalchemy.orm import Session


def stale_before(minutes: int) -> datetime:
    return datetime.utcnow() - timedelta(minutes=minutes)


def is_stale(status: str, updated_at: datetime | None, cutoff: datetime) -> bool:
    return bool(status in {"queued", "processing"} and updated_at and updated_at <= cutoff)


def enqueue_job(
    db: Session,
    *,
    model: type,
    identity_filters: Iterable[Any],
    status_column: Any,
    job_id_column: Any,
    updated_at_column: Any,
    error_column: Any,
    current_status: str,
    current_job_id: str | None,
    stale_cutoff: datetime | None = None,
) -> str | None:
    """Atomically transition one eligible resource to a new queued job."""
    query = db.query(model).filter(*identity_filters, status_column == current_status)
    query = (
        query.filter(job_id_column.is_(None))
        if current_job_id is None
        else query.filter(job_id_column == current_job_id)
    )
    if stale_cutoff is not None:
        query = query.filter(updated_at_column <= stale_cutoff)

    job_id = str(uuid.uuid4())
    claimed = query.update(
        {
            status_column: "queued",
            job_id_column: job_id,
            updated_at_column: datetime.utcnow(),
            error_column: None,
        },
        synchronize_session=False,
    )
    if claimed != 1:
        db.rollback()
        return None
    db.commit()
    return job_id


def claim_worker_job(
    db: Session,
    *,
    model: type,
    identity_filters: Iterable[Any],
    entity: Any,
    job_id: str,
    celery_task_id: str | None,
    retries: int,
    status_column: Any,
    job_id_column: Any,
    updated_at_column: Any,
    error_column: Any,
    status_attr: str,
    job_id_attr: str,
) -> bool:
    """Claim queued work or admit a Celery retry for the same persisted job."""
    if getattr(entity, job_id_attr) != job_id:
        return False
    if celery_task_id and celery_task_id != job_id:
        return False

    current_status = getattr(entity, status_attr)
    if current_status in {"completed", "failed"}:
        return False

    if current_status == "queued":
        claimed = db.query(model).filter(
            *identity_filters,
            job_id_column == job_id,
            status_column == "queued",
        ).update(
            {
                status_column: "processing",
                updated_at_column: datetime.utcnow(),
                error_column: None,
            },
            synchronize_session=False,
        )
        db.commit()
        return claimed == 1

    if current_status == "processing" and retries > 0:
        db.query(model).filter(
            *identity_filters,
            job_id_column == job_id,
            status_column == "processing",
        ).update(
            {updated_at_column: datetime.utcnow()},
            synchronize_session=False,
        )
        db.commit()
        return True

    return False
