"""SQLAlchemy prescription model."""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from datetime import datetime
import uuid
from core.database import Base

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    visit_id = Column(String, ForeignKey("visits.id"))
    doctor_id = Column(String, ForeignKey("users.id"))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Background risk-check lifecycle: not_requested | queued | processing |
    # completed | failed. The job ID is also the Celery task ID.
    risk_status = Column(String, default="not_requested", nullable=False)
    risk_job_id = Column(String, nullable=True)
    risk_status_updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    risk_error = Column(String(255), nullable=True)


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    prescription_id = Column(String, ForeignKey("prescriptions.id"))
    medicine_name = Column(String)
    dosage = Column(String)
    duration = Column(String)
    frequency = Column(String)