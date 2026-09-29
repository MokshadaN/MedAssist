"""Audit log SQLAlchemy model for HIPAA-compliant PHI access tracking."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String

from core.database import Base


class AuditLog(Base):
    """Records every access to Protected Health Information (PHI)."""

    __tablename__ = "audit_logs"

    id: str = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp: datetime = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Who performed the action
    actor_id: str = Column(String, nullable=False, index=True)
    actor_role: str = Column(String, nullable=False)  # "doctor" | "patient" | "system"
    ip_address: str = Column(String, nullable=True)

    # What was accessed
    resource_type: str = Column(String, nullable=False)  # e.g. "patient_record", "prescription", "report"
    resource_id: str = Column(String, nullable=False)
    action: str = Column(String, nullable=False)        # "read" | "write" | "delete" | "analyze"

    # Optional detail
    detail: str = Column(String, nullable=True)
