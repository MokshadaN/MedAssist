"""Notification endpoints."""
from fastapi import APIRouter

router = APIRouter()

@router.get("")
def get_notifications():
    return [{"message": "Reminder"}]

@router.post("/mark-read")
def mark_read(notification_id: str):
    return {"status": "updated"}