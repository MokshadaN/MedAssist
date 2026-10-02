"""SQLAlchemy report model."""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from datetime import datetime
import uuid
from core.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("users.id"))
    file_url = Column(String)
    parsed_data = Column(Text)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    # Report analysis lifecycle (P0): uploaded | queued | processing | completed | failed
    analysis_status = Column(String, default="uploaded", nullable=False)
    analysis_job_id = Column(String, nullable=True)
    analysis_status_updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    # Store only bounded, patient-safe failure text; detailed exceptions belong
    # in protected observability systems, never in this PHI-facing record.
    analysis_error = Column(String(255), nullable=True)