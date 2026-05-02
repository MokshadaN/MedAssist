"""SQLAlchemy medical metric model."""

from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from datetime import datetime
import uuid
from core.database import Base

class MedicalMetric(Base):
    __tablename__ = "medical_metrics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("users.id"))
    report_id = Column(String, ForeignKey("reports.id"))
    parameter = Column(String)
    value = Column(Float)  # We'll try to convert string values to float for graphing
    raw_value = Column(String)  # Store the original string value
    units = Column(String)
    interpretation = Column(String)
    severity = Column(String)
    measured_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
