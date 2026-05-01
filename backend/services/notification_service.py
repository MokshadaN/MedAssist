"""Notification service."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.notification import Notification


def create_notification(db: Session, user_id: str, message: str, type: str) -> Notification:
    notification = Notification(
        user_id=user_id,
        message=message.strip(),
        type=type.strip(),
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_notifications(db: Session, user_id: str) -> list[Notification]:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.is_read.asc(), Notification.created_at.desc())
        .all()
    )


def get_notification(db: Session, notification_id: str) -> Notification:
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return notification


def mark_read(db: Session, notification_id: str, user_id: str) -> Notification:
    notification = get_notification(db, notification_id)
    if notification.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to modify this notification",
        )
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification

