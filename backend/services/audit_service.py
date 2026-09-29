"""HIPAA Audit service — logs all access to Protected Health Information."""

import logging
from datetime import datetime
from typing import Optional

from fastapi import Request
from sqlalchemy.orm import Session

from models.audit_log import AuditLog

logger = logging.getLogger(__name__)


def log_phi_access(
    db: Session,
    actor_id: str,
    actor_role: str,
    resource_type: str,
    resource_id: str,
    action: str,
    request: Optional[Request] = None,
    detail: Optional[str] = None,
) -> None:
    """
    Record a PHI access event to the audit_logs table.

    Args:
        db:            Database session.
        actor_id:      ID of the user performing the action.
        actor_role:    Role of the actor ("doctor", "patient", "system").
        resource_type: Type of resource accessed ("patient_record", "prescription",
                       "report", "visit", "triage", "session").
        resource_id:   ID of the specific resource record.
        action:        Action performed ("read", "write", "delete", "analyze", "export").
        request:       Optional FastAPI Request (for extracting client IP).
        detail:        Optional free-text detail.
    """
    ip_address: Optional[str] = None
    if request:
        # Respect X-Forwarded-For for reverse-proxy deployments
        forwarded_for = request.headers.get("X-Forwarded-For")
        ip_address = forwarded_for.split(",")[0].strip() if forwarded_for else request.client.host

    entry = AuditLog(
        actor_id=actor_id,
        actor_role=actor_role,
        ip_address=ip_address,
        resource_type=resource_type,
        resource_id=resource_id,
        action=action,
        detail=detail,
        timestamp=datetime.utcnow(),
    )

    try:
        db.add(entry)
        db.commit()
    except Exception as exc:
        # Audit failures must never crash the main request — log and continue.
        logger.error("Failed to write audit log entry: %s", exc, exc_info=True)
        db.rollback()
