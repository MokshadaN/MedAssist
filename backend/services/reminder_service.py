"""Reminder service."""

from datetime import datetime
from typing import List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from models.reminder import Reminder


def _get_reminder_by_key(
    db: Session,
    user_id: str,
    idempotency_key: str,
) -> Reminder | None:
    return (
        db.query(Reminder)
        .filter(
            Reminder.user_id == user_id,
            Reminder.idempotency_key == idempotency_key,
        )
        .first()
    )


def create_reminder(
    db: Session,
    user_id: str,
    message: str,
    time: datetime,
    *,
    idempotency_key: str | None = None,
) -> Reminder:
    normalized_key = idempotency_key.strip() if idempotency_key else None
    normalized_key = normalized_key or None
    if normalized_key:
        existing = _get_reminder_by_key(db, user_id, normalized_key)
        if existing:
            return existing

    reminder = Reminder(
        user_id=user_id,
        message=message,
        time=time,
        idempotency_key=normalized_key,
    )
    db.add(reminder)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if normalized_key:
            existing = _get_reminder_by_key(db, user_id, normalized_key)
            if existing:
                return existing
        raise
    db.refresh(reminder)

    return reminder


def get_reminders(
    db: Session,
    user_id: str,
    *,
    limit: int = 50,
    offset: int = 0,
) -> List[Reminder]:
    return (
        db.query(Reminder)
        .filter(Reminder.user_id == user_id)
        .order_by(Reminder.is_completed.asc(), Reminder.time.asc(), Reminder.id.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def get_reminder(db: Session, reminder_id: str) -> Reminder | None:
    return db.query(Reminder).filter(Reminder.id == reminder_id).first()


def mark_reminder_completed(db: Session, reminder: Reminder, is_completed: bool = True) -> Reminder:
    reminder.is_completed = is_completed
    db.commit()
    db.refresh(reminder)
    return reminder


def delete_reminder(db: Session, reminder: Reminder) -> None:
    db.delete(reminder)
    db.commit()
