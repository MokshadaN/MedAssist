"""API v1 router."""

from fastapi import APIRouter
from api.v1.endpoints import auth, sessions, messages, triage, reports, ai, doctor, prescriptions, visits, notifications, feedback

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth")
api_router.include_router(sessions.router, prefix="/chat")
api_router.include_router(messages.router, prefix="/chat")
api_router.include_router(triage.router, prefix="/triage")
api_router.include_router(reports.router, prefix="/reports")
api_router.include_router(ai.router, prefix="/ai")
api_router.include_router(doctor.router, prefix="/doctor")
api_router.include_router(visits.router, prefix="/visit")
api_router.include_router(prescriptions.router, prefix="/prescription")
api_router.include_router(feedback.router, prefix="/feedback")
api_router.include_router(notifications.router, prefix="/notifications")