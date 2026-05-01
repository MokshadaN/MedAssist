"""Notification endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db
from schemas.notification import NotificationOut
from services.notification_service import get_notifications, mark_read

router = APIRouter(tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_notifications(db, current_user.id)


@router.post("/mark-read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return mark_read(db, notification_id, current_user.id)
