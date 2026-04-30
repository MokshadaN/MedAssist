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


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    prescription_id = Column(String, ForeignKey("prescriptions.id"))
    medicine_name = Column(String)
    dosage = Column(String)
    duration = Column(String)
    frequency = Column(String)