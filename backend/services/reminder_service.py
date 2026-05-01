"""Reminder service."""

from datetime import datetime
from typing import List

from sqlalchemy.orm import Session

from models.reminder import Reminder


def create_reminder(db: Session, user_id: str, message: str, time: datetime) -> Reminder:
    reminder = (
        db.query(Reminder)
        .filter(Reminder.user_id == user_id, Reminder.is_completed == False)  # noqa: E712
        .order_by(Reminder.time.desc())
        .first()
    )

    if reminder:
        reminder.message = message
        reminder.time = time
        db.commit()
        db.refresh(reminder)
        return reminder

    reminder = Reminder(user_id=user_id, message=message, time=time)
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


def get_reminders(db: Session, user_id: str) -> List[Reminder]:
    return (
        db.query(Reminder)
        .filter(Reminder.user_id == user_id)
        .order_by(Reminder.is_completed.asc(), Reminder.time.asc())
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

